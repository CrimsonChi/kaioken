import { VNode } from "./types"
import { globalState as g } from "./globalState"

export { mount, createElement, fragment }

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

function fragment({ children }: { children: VNode[] }) {
  return children
}
