import { EffectTag } from "./constants.js"
import { contexts } from "./globals.js"
import { createElement } from "./index.js"
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
    contexts.push(this)
  }

  mount() {
    return new Promise<AppContext<T>>((resolve) => {
      if (this.mounted) return resolve(this)
      this.scheduler = new Scheduler(this, this.options?.maxFrameMs ?? 50)
      this.rootNode = createElement(
        this.root!.nodeName.toLowerCase(),
        {},
        createElement(this.appFunc, this.appProps)
      )
      this.rootNode.dom = this.root
      this.scheduler.queueUpdate(this.rootNode)
      this.scheduler.wake()
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
      throw new Error(
        "[kaioken]: failed to apply new props - ensure the app is mounted"
      )
    return new Promise<AppContext<T>>((resolve) => {
      scheduler.clear()
      const { children, ref, key, ...rest } = rootChild.props
      const args = rest as T
      Object.assign(rootChild.props, fn(args))
      scheduler.queueUpdate(rootChild)
      scheduler.nextIdle(() => resolve(this))
    })
  }

  requestUpdate(node: VNode) {
    if (node.effectTag === EffectTag.DELETION) return
    return this.scheduler?.queueUpdate(node)
  }

  requestDelete(node: VNode) {
    if (node.effectTag === EffectTag.DELETION) return
    this.scheduler?.queueDelete(node)
  }

  queueEffect(callback: Function) {
    this.scheduler?.nodeEffects.push(callback)
  }
}
