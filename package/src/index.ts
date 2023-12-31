import { str_internal } from "./constants"
import { diffMerge } from "./diffMerge"
//import { diffMerge } from "./diffMerge"
import type {
  ComponentState,
  Component,
  JSXTag,
  IComponentDefinition,
  ComponentProps,
} from "./types"

let currentInstance: ReflexDOM | null = null

export class ReflexDOM {
  // @ts-expect-error
  private app?: Component
  private updateQueued = false
  private updateQueue: Component[] = []
  renderStack: Component[] = []

  constructor(private root: Element | null) {
    if (currentInstance) {
      throw new Error("Only one instance of ReflexDOM is allowed")
    }
    currentInstance = this
  }

  public mount(
    appFunc: (props: ComponentProps, children: unknown[]) => Component
  ) {
    // @ts-expect-error
    const app = (this.app = appFunc())
    createStateProxy(app)
    const { state, props } = app

    if (app.init) {
      app.destroy = app.init({ state, props }) ?? undefined
    }

    this.renderStack.push(app)
    const node = app.render({ state, props }) as Node | null
    this.renderStack.pop()

    if (node === null) return
    app.node = this.root?.appendChild(node)

    return this
  }

  queueUpdate(component: Component) {
    if (component.dirty) return
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
      component.dirty = false

      this.renderStack.push(component)
      const newNode = component.render({
        state: component.state,
        props: component.props,
      }) as Element | null
      this.renderStack.pop()

      const node = component.node as Element | null

      if (!node && newNode === null) continue
      if (node && newNode) {
        diffMerge(node, newNode)
        //node.replaceWith(newNode)
      } else if (node && !newNode) {
        node.remove()
      } else if (!node && newNode) {
      }
    }
  }
}

function createStateProxy<T extends ComponentState>(component: Component<T>) {
  component.state = new Proxy(component.state ?? {}, {
    set(target, key, value) {
      target[key as keyof T] = value
      currentInstance?.queueUpdate(component)
      return true
    },
    get(target, p, receiver) {
      return Reflect.get(target, p, receiver)
    },
  })
}

export function defineComponent<
  T extends ComponentState,
  U extends ComponentProps
>(defs: IComponentDefinition<T, U>) {
  const initial = {
    [str_internal]: true,
    dirty: false,
    state: defs.state ?? ({} as T),
    props: {},
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
  if (typeof tag === "function") {
    const component = tag(props, children)
    createStateProxy(component)
    component.props = props ?? ({} as ComponentProps)

    if (component.init) {
      component.destroy =
        component.init({ state: component.state, props }) ?? undefined
    }

    currentInstance?.renderStack.push(component)
    const node = component.render({
      state: component.state,
      props,
    }) as Node | null
    currentInstance?.renderStack.pop()
    component.node = node

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
