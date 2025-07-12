import { flags } from "./flags.js"
import { FLAG } from "./constants.js"
import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { createScheduler, Scheduler } from "./scheduler.js"
import { generateRandomID } from "./generateId.js"

type VNode = Kaioken.VNode

export interface AppContextOptions {
  root?: HTMLElement
  /**
   * @internal
   * Sets the root node type for the app. Used for SSR & rendering without the DOM.
   */
  rootType?: ({ children }: { children: JSX.Children }) => JSX.Element
  /**
   * Sets the maximum render refresh time.
   * @default 50
   */
  maxFrameMs?: number
  name?: string
  debug?: {
    onRequestUpdate?: (vNode: VNode) => void
  }
}

export interface AppContext<T extends Record<string, unknown> = {}> {
  id: string
  name: string
  scheduler?: Scheduler
  rootNode?: VNode
  root?: HTMLElement
  mounted: boolean
  mount(): Promise<AppContext<T>>
  unmount(): Promise<AppContext<T>>
  setProps(fn: (oldProps: T) => T): Promise<AppContext<T>>
  flushSync(): void
  requestUpdate(vNode?: VNode): void
  requestDelete(vNode: VNode): void
}

export function createAppContext<T extends Record<string, unknown> = {}>(
  appFunc: (props: T) => JSX.Element,
  appProps = {} as T,
  options?: AppContextOptions
): AppContext<T> {
  const id = generateRandomID()
  const name = options?.name ?? "App-" + id
  let root = options?.root
  let scheduler: Scheduler | undefined
  let mounted = false
  let appContext: AppContext<T>

  const appNode = createElement(appFunc, appProps as T)
  appNode.depth = 1
  const rootNode = options?.rootType
    ? createElement(options.rootType, {}, appNode)
    : root
    ? createElement(root!.nodeName.toLowerCase(), {}, appNode)
    : void 0
  if (rootNode) {
    rootNode.depth = 0
  }

  function mount(): Promise<AppContext<T>> {
    return new Promise<AppContext<T>>((resolve, reject) => {
      if (mounted) return resolve(appContext)
      if (!rootNode) return reject(new KaiokenError("Root node not configured"))
      root ??= document.body
      rootNode.dom = root
      if (__DEV__) {
        root.__kaiokenNode = rootNode
      }
      scheduler = createScheduler(appContext, options?.maxFrameMs ?? 50)
      if (renderMode.current === "hydrate") {
        hydrationStack.captureEvents(root!)
      }
      scheduler.nextIdle(() => {
        if (renderMode.current === "hydrate") {
          hydrationStack.releaseEvents(root!)
        }
        mounted = true
        window.__kaioken?.emit("mount", appContext as AppContext<any>)
        resolve(appContext)
      }, false)
      scheduler.queueUpdate(rootNode)
      scheduler.flushSync()
    })
  }

  function unmount(): Promise<AppContext<T>> {
    return new Promise<AppContext<T>>((resolve) => {
      if (!mounted) return resolve(appContext)
      if (!rootNode?.child) return resolve(appContext)
      requestDelete(rootNode.child)

      scheduler?.nextIdle(() => {
        scheduler = undefined
        rootNode && (rootNode.child = null)
        mounted = false
        window.__kaioken?.emit("unmount", appContext as AppContext<any>)
        resolve(appContext)
      })
    })
  }

  function setProps(fn: (oldProps: T) => T): Promise<AppContext<T>> {
    const rootChild = rootNode?.child
    if (!mounted || !rootChild || !scheduler)
      throw new KaiokenError(
        "Failed to apply new props - ensure the app is mounted"
      )
    return new Promise<AppContext<T>>((resolve) => {
      scheduler!.clear()
      const { children, ref, key, ...rest } = rootChild.props
      rootChild.props = {
        ...Object.assign(rest, fn(rest as T)),
        children,
        ref,
        key,
      }
      scheduler!.queueUpdate(rootChild)
      scheduler!.nextIdle(() => resolve(appContext))
    })
  }

  function flushSync(): void {
    scheduler?.flushSync()
  }

  function requestUpdate(vNode?: VNode): void {
    if (!vNode) {
      if (!mounted || !rootNode) return
      vNode = rootNode
    }
    if (flags.get(vNode.flags, FLAG.DELETION)) return
    if (__DEV__) {
      if (options?.debug?.onRequestUpdate) {
        options.debug.onRequestUpdate(vNode)
      }
    }
    if (renderMode.current === "hydrate") {
      return scheduler?.nextIdle((s) => {
        !flags.get(vNode.flags, FLAG.DELETION) && s.queueUpdate(vNode)
      })
    }
    scheduler?.queueUpdate(vNode)
  }

  function requestDelete(vNode: VNode): void {
    if (flags.get(vNode.flags, FLAG.DELETION)) return
    if (renderMode.current === "hydrate") {
      return scheduler?.nextIdle((s) => {
        !flags.get(vNode.flags, FLAG.DELETION) && s.queueDelete(vNode)
      })
    }
    scheduler?.queueDelete(vNode)
  }

  return (appContext = {
    id,
    name,
    get scheduler() {
      return scheduler
    },
    get rootNode() {
      return rootNode
    },
    get root() {
      return root
    },
    get mounted() {
      return mounted
    },
    mount,
    unmount,
    setProps,
    flushSync,
    requestUpdate,
    requestDelete,
  })
}
