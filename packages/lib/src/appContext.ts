import { EffectTag } from "./constants.js"
import { createElement } from "./element.js"
import { contexts, renderMode } from "./globals.js"
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
      this.rootNode = createElement(
        this.root!.nodeName.toLowerCase(),
        {},
        createElement(this.appFunc, this.appProps as T)
      )
      this.rootNode.dom = this.root
      this.scheduler.queueUpdate(this.rootNode)
      this.scheduler.nextIdle(() => {
        this.mounted = true
        contexts.push(this)
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
        contexts.splice(contexts.indexOf(this), 1)
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
    if (renderMode.current === "hydrate") {
      return this.scheduler?.nextIdle((s) => {
        node.effectTag !== EffectTag.DELETION && s.queueUpdate(node)
      })
    }
    this.scheduler?.queueUpdate(node)
  }

  requestDelete(node: VNode) {
    if (node.effectTag === EffectTag.DELETION) return
    if (renderMode.current === "hydrate") {
      return this.scheduler?.nextIdle((s) => {
        node.effectTag !== EffectTag.DELETION && s.queueDelete(node)
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
