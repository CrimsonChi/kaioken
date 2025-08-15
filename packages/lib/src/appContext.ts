import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { KiruError } from "./error.js"
import { renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import {
  requestDelete,
  requestUpdate,
  flushSync,
  nextIdle,
} from "./scheduler.js"
import { generateRandomID } from "./generateId.js"

type VNode = Kiru.VNode

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
  rootNode?: VNode
  root?: HTMLElement
  mounted: boolean
  mount(): Promise<AppContext<T>>
  unmount(): Promise<AppContext<T>>
  setProps(fn: (oldProps: T) => T): Promise<AppContext<T>>
}

export function createAppContext<T extends Record<string, unknown> = {}>(
  appFunc: (props: T) => JSX.Element,
  appProps = {} as T,
  options?: AppContextOptions
): AppContext<T> {
  const id = generateRandomID()
  const name = options?.name ?? "App-" + id
  let root = options?.root
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
      if (!rootNode) return reject(new KiruError("Root node not configured"))
      root ??= document.body
      rootNode.dom = root
      rootNode.app = appContext

      if (__DEV__) {
        root.__kiruNode = rootNode
      }
      if (renderMode.current === "hydrate") {
        hydrationStack.captureEvents(root!)
      }
      nextIdle(() => {
        if (renderMode.current === "hydrate") {
          hydrationStack.releaseEvents(root!)
        }
        mounted = true
        if (__DEV__) {
          window.__kiru?.emit("mount", appContext)
        }
        resolve(appContext)
      }, false)
      requestUpdate(rootNode)
      flushSync()
    })
  }

  function unmount(): Promise<AppContext<T>> {
    return new Promise<AppContext<T>>((resolve) => {
      if (!mounted) return resolve(appContext)
      if (!rootNode?.child) return resolve(appContext)
      requestDelete(rootNode.child)

      nextIdle(() => {
        rootNode && (rootNode.child = null)
        mounted = false
        if (__DEV__) {
          window.__kiru?.emit("unmount", appContext)
        }
        resolve(appContext)
      })
    })
  }

  function setProps(fn: (oldProps: T) => T): Promise<AppContext<T>> {
    const rootChild = rootNode?.child
    if (!mounted || !rootChild)
      throw new KiruError(
        "Failed to apply new props - ensure the app is mounted"
      )
    return new Promise<AppContext<T>>((resolve) => {
      const { children, ref, key, ...rest } = rootChild.props
      rootChild.props = {
        ...Object.assign(rest, fn(rest as T)),
        children,
        ref,
        key,
      }
      requestUpdate(rootChild)
      nextIdle(() => resolve(appContext))
    })
  }

  return (appContext = {
    id,
    name,
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
  })
}
