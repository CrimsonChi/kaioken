import type {
  ComponentState,
  Component,
  JSXTag,
  IComponentDefinition,
} from "./types"

export class ReflexDOM {
  static mount(root: Element, appFunc: () => Component) {
    const app = appFunc()
    const node = app.render({ state: app.state })
    if (node === null) return
    app.node = node as Node
    root.appendChild(app.node)
  }
}

function createStateProxy<T extends ComponentState>(
  state: T,
  component: Component<T>
): T {
  return new Proxy(state, {
    set(target, key, value) {
      target[key as keyof T] = value
      component.dirty = true
      return true
    },
  })
}

export function defineComponent<T extends ComponentState>(
  args: IComponentDefinition<T>
): () => Component<T> {
  return () => {
    return {
      state: {} as T,
      node: null,
      dirty: false,
      ...args,
    }
  }
}

export function h(
  tag: JSXTag,
  props: Record<string, unknown> | null = null,
  ...children: unknown[]
): JSX.Element | null {
  if (typeof tag === "function") {
    const component = tag(props, children)
    component.state = createStateProxy(component.state, component)
    if (component.init) component.init({ state: component.state })
    return component.render({ state: component.state })
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
