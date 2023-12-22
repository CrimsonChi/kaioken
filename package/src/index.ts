import { str_internal } from "./constants"
import type {
  ComponentState,
  Component,
  JSXTag,
  IComponentDefinition,
} from "./types"

export class ReflexDOM {
  private static instance = new ReflexDOM()

  private components: Component[] = []
  private updateQueued = false
  private _app?: Component

  get root() {
    return this.app?.node
  }

  get app() {
    return this._app
  }
  set app(app: Component | undefined) {
    this._app = app
  }

  public static mount(root: Element, appFunc: () => Component) {
    const app = appFunc()
    app.state = this.getInstance().createStateProxy(app.state)
    ReflexDOM.getInstance().app = app
    if (app.init) app.init({ state: app.state })
    const node = app.render({ state: app.state })
    if (node === null) return
    app.node = node as Node
    root.appendChild(app.node)
    return ReflexDOM.getInstance()
  }

  static getInstance() {
    if (this.instance === null) {
      this.instance = new ReflexDOM()
    }
    return this.instance
  }

  private queueUpdate() {
    if (this.updateQueued) return
    this.updateQueued = true
    queueMicrotask(() => {
      this.updateQueued = false
      this.update()
    })
  }

  private update() {
    this.components.forEach((component) => {
      if (!component.dirty) return
      component.dirty = false
      const node = component.render({ state: component.state })
      if (node === null) {
        ;(component.node as Element)?.remove()
        component.node = null
        return
      }
      if (component.node === null) {
        component.node = node as Node
      } else {
        ;(component.node as Element).replaceWith(node as Node)
        component.node = node as Node
      }
    })
  }

  private createStateProxy<T extends ComponentState>(
    component: Component<T>
  ): T {
    const instance = this
    const state = component.state ?? {}
    return new Proxy(state, {
      set(target, key, value) {
        target[key as keyof T] = value
        component.dirty = true
        instance.queueUpdate()
        return true
      },
    })
  }

  registerComponent(component: Component) {
    component.state = this.createStateProxy(component)
    this.components.push(component)
  }
}

export function defineComponent<T extends ComponentState>(
  args: IComponentDefinition<T>
): () => Component<T> {
  return () => {
    return {
      [str_internal]: true,
      state: {} as T,
      node: null,
      dirty: false,
      parent: undefined,
      ...args,
    }
  }
}

function isComponent<T extends ComponentState>(
  node: unknown
): node is Component<T> {
  return !!node && str_internal in (node as Component)
}

export function h(
  tag: JSXTag,
  props: Record<string, unknown> | null = null,
  ...children: unknown[]
): JSX.Element | null {
  if (typeof tag === "function") {
    const component = tag(props, children)
    for (const child of children) {
      if (isComponent(child)) {
        child.parent = component
      }
    }
    ReflexDOM.getInstance().registerComponent(component)

    if (component.init) component.init({ state: component.state })
    const node = component.render({ state: component.state })
    if (node === null) return null
    component.node = node as Node
    return component.node as JSX.Element
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
