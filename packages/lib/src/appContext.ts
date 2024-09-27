import { bitmapOps } from "./bitmap.js"
import { FLAG } from "./constants.js"
import { createElement } from "./element.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { Scheduler } from "./scheduler.js"

type VNode = Kaioken.VNode

export interface AppContextOptions {
  root: HTMLElement
  /**
   * Sets the maximum render refresh time.
   * @default 50
   */
  maxFrameMs?: number
  name?: string
}

export class AppContext<T extends Record<string, unknown> = {}> {
  id: number
  name: string
  scheduler: Scheduler | undefined
  rootNode: VNode | undefined = undefined
  hookIndex = 0
  root?: HTMLElement
  mounted = false

  constructor(
    private appFunc: (props: T) => JSX.Element,
    private appProps = {},
    private options?: AppContextOptions
  ) {
    this.id = Date.now()
    this.name = options?.name ?? "App-" + this.id
    this.root = options?.root
  }

  mount() {
    return new Promise<AppContext<T>>((resolve) => {
      if (this.mounted) return resolve(this)
      this.scheduler = new Scheduler(this, this.options?.maxFrameMs ?? 50)
      if (renderMode.current === "hydrate") {
        hydrationStack.captureEvents(this.root!, this.scheduler)
      }
      const appNode = createElement(this.appFunc, this.appProps as T)
      this.rootNode = createElement(
        this.root!.nodeName.toLowerCase(),
        {},
        appNode
      )
      this.rootNode.depth = 0
      appNode.depth = 1
      if (__DEV__) {
        if (this.root) {
          this.root.__kaiokenNode = this.rootNode
        }
      }

      this.rootNode.dom = this.root
      this.scheduler.queueUpdate(this.rootNode)
      this.scheduler.nextIdle(() => {
        this.mounted = true
        window.__kaioken?.emit("mount", this as AppContext<any>)
        resolve(this)
      })
    })
  }

  unmount() {
    return new Promise<AppContext<T>>((resolve) => {
      if (!this.mounted) return resolve(this)
      if (!this.rootNode?.child) return resolve(this)
      this.requestDelete(this.rootNode.child)

      this.scheduler?.nextIdle(() => {
        this.scheduler = undefined
        this.rootNode && (this.rootNode.child = undefined)
        this.mounted = false
        window.__kaioken?.emit("unmount", this as AppContext<any>)
        resolve(this)
      })
    })
  }

  setProps(fn: (oldProps: T) => T) {
    const rootChild = this.rootNode?.child
    const scheduler = this.scheduler
    if (!this.mounted || !rootChild || !scheduler)
      throw new KaiokenError(
        "Failed to apply new props - ensure the app is mounted"
      )
    return new Promise<AppContext<T>>((resolve) => {
      scheduler.clear()
      const { children, ref, key, ...rest } = rootChild.props
      rootChild.props = {
        ...Object.assign(rest, fn(rest as T)),
        children,
        ref,
        key,
      }
      scheduler.queueUpdate(rootChild)
      scheduler.nextIdle(() => resolve(this))
    })
  }

  requestUpdate(node: VNode) {
    if (bitmapOps.isFlagSet(node, FLAG.DELETION)) return
    if (renderMode.current === "hydrate") {
      return this.scheduler?.nextIdle((s) => {
        !bitmapOps.isFlagSet(node, FLAG.DELETION) && s.queueUpdate(node)
      })
    }
    this.scheduler?.queueUpdate(node)
  }

  requestDelete(node: VNode) {
    if (bitmapOps.isFlagSet(node, FLAG.DELETION)) return
    if (renderMode.current === "hydrate") {
      return this.scheduler?.nextIdle((s) => {
        !bitmapOps.isFlagSet(node, FLAG.DELETION) && s.queueDelete(node)
      })
    }
    this.scheduler?.queueDelete(node)
  }

  queueEffect(vNode: VNode, effect: Function) {
    this.scheduler?.queueEffect(vNode, effect)
  }

  queueImmediateEffect(vNode: VNode, effect: Function) {
    this.scheduler?.queueImmediateEffect(vNode, effect)
  }
}
