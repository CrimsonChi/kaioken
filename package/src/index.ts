import { Context, ProviderProps, VNode } from "./types"
import { globalState as g } from "./globalState"

export { mount, createElement, fragment, createContext }

function mount(appFunc: () => VNode, container: HTMLElement) {
  console.log("mounting", appFunc, container)
  g.wipNode = {
    type: container.nodeName.toLowerCase(),
    dom: container,
    props: {
      children: [
        {
          type: appFunc,
          props: {
            children: [],
          },
          hooks: [],
        },
      ],
    },
    hooks: [],
  }
  g.deletions = []
  g.nextUnitOfWork = g.wipNode
  g.mounted = true
  g.workLoop()
}

function createElement(
  type: string | Function,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  return {
    type,
    props: {
      ...props,
      children: children
        .flat()
        .map((child) =>
          typeof child === "object" ? child : createTextElement(String(child))
        ) as VNode[],
    },
    hooks: [],
  }
}

function createTextElement(text: string): VNode {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
    hooks: [],
  }
}

function fragment({ children }: { children: JSX.Element[] }) {
  return children
}

function createContext<T>(initial: T | null): Context<T> {
  let context = initial as T

  return {
    Provider: ({ value, children = [] }: ProviderProps<T>) => {
      context = value
      return fragment({ children }) as JSX.Element
    },
    value: () => context,
  }
}
