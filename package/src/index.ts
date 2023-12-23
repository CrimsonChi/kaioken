import { str_internal } from "./constants"
import type {
  ComponentState,
  Component,
  JSXTag,
  IComponentDefinition,
  ComponentProps,
  NodeToComponentMap,
  ComponentToNodeMap,
} from "./types"

export class ReflexDOM {
  private static instance = new ReflexDOM()
  private nodeMap: NodeToComponentMap = new WeakMap()
  private componentMap: ComponentToNodeMap = new WeakMap()

  private updateQueued = false
  private updateQueue: Component[] = []
  private _app?: Component
  private renderStack: Component[] = []

  get root() {
    return this.app?.node as Element | null
  }

  get app() {
    return this._app
  }
  set app(app: Component | undefined) {
    this._app = app
  }

  getRenderStack() {
    return this.renderStack
  }

  getNodeMap() {
    return this.nodeMap
  }

  getComponentMap() {
    return this.componentMap
  }

  public static mount(
    root: Element,
    appFunc: (props: ComponentProps) => Component
  ) {
    const instance = ReflexDOM.getInstance()
    // @ts-expect-error
    const app = appFunc()
    app.state = createStateProxy(app)
    instance.app = app

    if (app.init) {
      app.destroy = app.init({ state: app.state, props: null }) ?? undefined
    }

    instance.renderStack.push(app)
    const node = app.render({ state: app.state, props: null }) as Node | null
    instance.renderStack.pop()
    instance.componentMap.set(app, node)

    if (node === null) return
    instance.nodeMap.set(node, app)
    root.appendChild(node)

    return ReflexDOM.getInstance()
  }

  static getInstance() {
    if (this.instance === null) {
      this.instance = new ReflexDOM()
    }
    return this.instance
  }

  queueUpdate(component: Component) {
    component.dirty = true
    this.updateQueue.push(component)

    if (this.updateQueued) return
    this.updateQueued = true
    queueMicrotask(() => {
      this.updateQueued = false
      this.update()
    })
  }

  private update() {
    const queue = [...this.updateQueue]
    this.updateQueue = []
    for (const component of queue) {
      if (!component.dirty) continue

      const parent = this.renderStack[this.renderStack.length - 1]

      component.dirty = false
      const node = this.componentMap.get(component) as Element | null

      this.renderStack.push(component)
      const newNode = component.render({
        state: component.state,
        props: null,
      }) as Element | null
      this.renderStack.pop()

      if (node === null && newNode === null) continue
      if (node && newNode) {
        node.replaceWith(newNode)
        this.nodeMap.set(newNode, component)
        this.componentMap.set(component, newNode)
      } else if (node && !newNode) {
        node.remove()
        this.nodeMap.delete(node)
        this.componentMap.delete(component)
      } else if (!node && newNode) {
        this.nodeMap.set(newNode, component)
        this.componentMap.set(component, newNode)
      }
    }
  }
}

function createStateProxy<T extends ComponentState>(
  component: Component<T>
): T {
  const state = component.state ?? {}
  return new Proxy(state, {
    set(target, key, value) {
      target[key as keyof T] = value
      ReflexDOM.getInstance().queueUpdate(component)
      return true
    },
  })
}

export function defineComponent<
  T extends ComponentState,
  U extends ComponentProps
>(defs: IComponentDefinition<T, U>) {
  const initial = {
    [str_internal]: true,
    node: null,
    dirty: false,
    state: defs.state ?? ({} as T),
    props: null,
    render: defs.render,
    init: defs.init,
  } as Component<T, U>

  return function (props: U, children: unknown[]): Component<T, U> {
    const component = { ...initial, props, children }
    return component as Component<T, U>
  }
}

export function h(
  tag: JSXTag,
  props: Record<string, unknown> | null = null,
  ...children: unknown[]
): JSX.Element | null {
  const instance = ReflexDOM.getInstance()
  if (typeof tag === "function") {
    const component = tag(props, children)
    component.state = createStateProxy(component)
    component.props = props ?? ({} as ComponentProps)

    if (component.init) {
      component.destroy =
        component.init({ state: component.state, props }) ?? undefined
    }

    const stack = instance.getRenderStack()
    stack.push(component)
    const node = component.render({
      state: component.state,
      props,
    }) as Node | null
    stack.pop()

    component.node = node
    instance.getComponentMap().set(component, node)
    if (node) instance.getNodeMap().set(node, component)
    return node
  }

  const el = document.createElement(tag)

  if (props === null) {
    props = {}
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === "style") {
      Object.assign(el.style, value)
    } else if (key.startsWith("on")) {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value as EventListener)
    } else {
      el.setAttribute(key, value as string)
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) {
      continue
    } else if (Array.isArray(child)) {
      el.append(...child)
    } else if (child instanceof Node) {
      el.appendChild(child)
    } else {
      el.appendChild(document.createTextNode(child.toString()))
    }
  }

  return el
}
