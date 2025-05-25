import { $HMR_ACCEPT } from "./constants.js"
import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { node, renderMode } from "./globals.js"
import { HMRAccept } from "./hmr.js"
import { useContext } from "./hooks/useContext.js"
import { useAppContext, useRequestUpdate } from "./hooks/utils.js"
import { hydrationStack } from "./hydration.js"
import {
  HYDRATION_BOUNDARY_MARKER,
  HydrationBoundaryContext,
} from "./ssr/hydrationBoundary.js"
import { traverseApply } from "./utils.js"

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

const interactionEvents = ["pointerdown", "keydown", "focus", "input"]

export function lazy<T extends LazyImportValue>(
  componentPromiseFn: () => Promise<T>
): Kaioken.FC<LazyComponentProps<T>> {
  function LazyComponent(props: LazyComponentProps<T>) {
    const appCtx = useAppContext()
    const hydrationCtx = useContext(HydrationBoundaryContext, false)
    const { fallback = null, ...rest } = props
    const requestUpdate = useRequestUpdate()
    if (renderMode.current === "string" || renderMode.current === "stream") {
      return fallback
    }

    const asStr = cleanFnStr(componentPromiseFn.toString())
    const cachedState = lazyCache.get(asStr)

    if (!cachedState) {
      const promise = componentPromiseFn()
      const state: LazyState = {
        promise,
        result: null,
      }
      lazyCache.set(asStr, state)
      if (hydrationCtx && renderMode.current === "hydrate") {
        const { parent, childNodes, startIndex } =
          consumeHydrationBoundaryChildren()
        for (const child of childNodes) {
          if (child instanceof Element) {
            hydrationStack.captureEvents(child)
          }
        }

        const ready = promise.then((componentOrModule) => {
          state.result =
            typeof componentOrModule === "function"
              ? componentOrModule
              : componentOrModule.default
        })

        const hydrate = () => {
          appCtx.scheduler?.nextIdle(() => {
            hydrationStack.push(parent)
            hydrationStack.childIdxStack[
              hydrationStack.childIdxStack.length - 1
            ] = startIndex
            const prev = renderMode.current
            requestUpdate()
            renderMode.current = "hydrate"
            appCtx.flushSync()
            renderMode.current = prev
            for (const child of childNodes) {
              if (child instanceof Element) {
                hydrationStack.releaseEvents(child)
              }
            }
          })
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
        } else {
          const eventIsFromChild = (e: Event) => {
            if (!(e.target instanceof Element)) {
              return false
            }
            return childNodes.some((child) =>
              child.contains(e.target as Element)
            )
          }
          const onInteraction = (e: Event) => {
            if (eventIsFromChild(e)) {
              ready.then(() => {
                hydrate()
                interactionEvents.forEach((event) => {
                  window.removeEventListener(event, onInteraction)
                })
              })
            }
          }
          interactionEvents.forEach((event) => {
            window.addEventListener(event, onInteraction)
          })
        }

        return null
      } else {
        promise.then((componentOrModule) => {
          state.result =
            typeof componentOrModule === "function"
              ? componentOrModule
              : componentOrModule.default
          requestUpdate()
        })
        return fallback
      }
    }

    if (cachedState.result === null) {
      cachedState.promise.then(requestUpdate)
      return fallback
    }
    if (__DEV__) {
      return createElement(cachedState.result, rest)
    }
    return createElement(cachedState.result, rest)
  }
  LazyComponent.displayName = "Kaioken.lazy"
  if (__DEV__) {
    return Object.assign(LazyComponent, {
      [$HMR_ACCEPT]: {
        inject: (prev) => {
          window.__kaioken!.apps.forEach((ctx) => {
            if (!ctx.mounted || !ctx.rootNode) return
            traverseApply(ctx.rootNode, (vNode) => {
              if (vNode.type === prev) {
                vNode.type = LazyComponent
                vNode.hmrUpdated = true
                if (vNode.prev) {
                  vNode.prev.type = LazyComponent
                }
                ctx.requestUpdate(vNode)
              }
            })
          })
        },
        destroy: () => {},
        provide: () => LazyComponent,
      } satisfies HMRAccept<Function>,
    })
  }
  return LazyComponent
}

const queryStrRegex = /\?[^"]*/
/**
 * removes the query string from a function - prevents
 * vite-modified imports (eg. () => import("./Counter.tsx?t=123456"))
 * from causing issues
 */
const cleanFnStr = (fnStr: string) => fnStr.replace(queryStrRegex, "")
