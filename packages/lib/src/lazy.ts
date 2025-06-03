import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { node, renderMode } from "./globals.js"
import { useContext } from "./hooks/useContext.js"
import { useRef } from "./hooks/useRef.js"
import { useAppContext, useRequestUpdate } from "./hooks/utils.js"
import { hydrationStack } from "./hydration.js"
import {
  HYDRATION_BOUNDARY_MARKER,
  HydrationBoundaryContext,
} from "./ssr/hydrationBoundary.js"
import type { SomeDom } from "./types.utils"

type FCModule = { default: Kaioken.FC<any> }
type LazyImportValue = Kaioken.FC<any> | FCModule
type InferLazyImportProps<T extends LazyImportValue> = T extends FCModule
  ? Kaioken.InferProps<T["default"]>
  : Kaioken.InferProps<T>

type LazyState = {
  promise: Promise<LazyImportValue>
  result: Kaioken.FC | null
}

type LazyComponentProps<T extends LazyImportValue> = InferLazyImportProps<T> & {
  fallback?: JSX.Element
}

const lazyCache: Map<string, LazyState> =
  "window" in globalThis
    ? // @ts-ignore - we're shamefully polluting the global scope here and hiding it 🥲
      (window.__KAIOKEN_LAZY_CACHE ??= new Map<string, LazyState>())
    : new Map<string, LazyState>()

function consumeHydrationBoundaryChildren(): {
  parent: HTMLElement
  childNodes: Node[]
  startIndex: number
} {
  const boundaryStart = hydrationStack.currentChild()
  if (
    boundaryStart?.nodeType !== Node.COMMENT_NODE ||
    boundaryStart.nodeValue !== HYDRATION_BOUNDARY_MARKER
  ) {
    throw new KaiokenError({
      message:
        "Invalid HydrationBoundary node. This is likely a bug in Kaioken.",
      fatal: true,
      vNode: node.current,
    })
  }
  const parent = boundaryStart.parentElement!
  const childNodes: Node[] = []
  const isBoundaryEnd = (n: Node) => {
    return (
      n.nodeType === Node.COMMENT_NODE &&
      n.nodeValue === "/" + HYDRATION_BOUNDARY_MARKER
    )
  }
  let n = boundaryStart.nextSibling
  boundaryStart.remove()
  const startIndex =
    hydrationStack.childIdxStack[hydrationStack.childIdxStack.length - 1]
  while (n && !isBoundaryEnd(n)) {
    childNodes.push(n)
    hydrationStack.bumpChildIndex()
    n = n.nextSibling
  }
  const boundaryEnd = hydrationStack.currentChild()
  if (!isBoundaryEnd(boundaryEnd)) {
    throw new KaiokenError({
      message:
        "Invalid HydrationBoundary node. This is likely a bug in Kaioken.",
      fatal: true,
      vNode: node.current,
    })
  }
  boundaryEnd.remove()
  return { parent, childNodes, startIndex }
}

export function lazy<T extends LazyImportValue>(
  componentPromiseFn: () => Promise<T>
): Kaioken.FC<LazyComponentProps<T>> {
  function LazyComponent(props: LazyComponentProps<T>) {
    const { fallback = null, ...rest } = props
    const appCtx = useAppContext()
    const hydrationCtx = useContext(HydrationBoundaryContext, false)
    const isPendingHydration = useRef(
      hydrationCtx && renderMode.current === "hydrate"
    )
    const requestUpdate = useRequestUpdate()
    if (renderMode.current === "string" || renderMode.current === "stream") {
      return fallback
    }

    console.log(
      "lazy - mounting",
      isPendingHydration.current ? "(pending hydration)" : ""
    )

    const asStr = componentPromiseFn.toString()
    const cachedState = lazyCache.get(asStr)
    if (!cachedState) {
      const promise = componentPromiseFn()
      const state: LazyState = {
        promise,
        result: null,
      }
      lazyCache.set(asStr, state)

      const ready = promise.then((componentOrModule) => {
        state.result =
          typeof componentOrModule === "function"
            ? componentOrModule
            : componentOrModule.default
      })

      if (!isPendingHydration.current) {
        console.log("lazy - queued requestUpdate")
        ready.then(() => requestUpdate())
        return fallback
      }

      const thisNode = node.current

      if (__DEV__) {
        window.__kaioken?.HMRContext?.onHmr(() => {
          console.log("lazy - onHmr cleanup")
          if (isPendingHydration.current) {
            for (const child of childNodes) {
              if (child instanceof Element) {
                hydrationStack.resetEvents(child)
              }
              child.parentNode?.removeChild(child)
            }
            isPendingHydration.current = false
            delete thisNode!.lastChildDom
          }
        })
      }

      const { parent, childNodes, startIndex } =
        consumeHydrationBoundaryChildren()

      thisNode!.lastChildDom = childNodes[childNodes.length - 1] as SomeDom

      for (const child of childNodes) {
        if (child instanceof Element) {
          hydrationStack.captureEvents(child)
        }
      }
      const hydrate = () => {
        console.log("lazy - hydrate")
        if (isPendingHydration.current === false) return

        appCtx.scheduler?.nextIdle(() => {
          console.log("lazy - performing syncHydrate")
          delete thisNode!.lastChildDom
          isPendingHydration.current = false
          hydrationStack.push(parent)
          hydrationStack.childIdxStack[
            hydrationStack.childIdxStack.length - 1
          ] = startIndex
          const prev = renderMode.current
          /**
           * must call requestUpdate before setting renderMode
           * to hydrate, otherwise the update will be postponed
           * and flushSync will have no effect
           */
          requestUpdate()
          renderMode.current = "hydrate"
          appCtx.flushSync()
          renderMode.current = prev
          for (const child of childNodes) {
            if (child instanceof Element) {
              hydrationStack.releaseEvents(child)
            }
          }
          console.log("lazy - performed syncHydrate")
        })
        console.log("lazy - queued syncHydrate")
      }

      /**
       * once the promise resolves, we need to act according
       * to the HydrationBoundaryContext 'mode'.
       *
       * - with 'eager', we just hydrate the children immediately
       * - with 'lazy', we'll wait for user interaction before hydrating
       */

      if (hydrationCtx.mode === "eager") {
        ready.then(hydrate)
        return null
      }
      const interactionEvents = hydrationCtx.events
      const onInteraction = (e: Event) => {
        const tgt = e.target
        if (
          tgt instanceof Element &&
          childNodes.some((child) => child.contains(tgt))
        ) {
          interactionEvents.forEach((evtName) => {
            window.removeEventListener(evtName, onInteraction)
          })
          ready.then(hydrate)
        }
      }
      interactionEvents.forEach((evtName) => {
        window.addEventListener(evtName, onInteraction)
      })

      return null
    }

    if (cachedState.result === null) {
      console.log("lazy - queued requestUpdate")
      cachedState.promise.then(requestUpdate)
      return fallback
    }
    return createElement(cachedState.result, rest)
  }
  LazyComponent.displayName = "Kaioken.lazy"
  return LazyComponent
}

// const queryStrRegex = /\?[^"]*/
// /**
//  * removes the query string from a function - prevents
//  * vite-modified imports (eg. () => import("./Counter.tsx?t=123456"))
//  * from causing issues
//  */
// const cleanFnStr = (fnStr: string) => fnStr.replace(queryStrRegex, "")
