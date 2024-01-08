import type { Rec, VNode } from "./types"
import { globalState as g } from "./globalState.js"

export { performUnitOfWork, commitWork, commitRoot }

function performUnitOfWork(vNode: VNode): VNode | undefined {
  const isFunctionComponent = vNode.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(vNode)
  } else {
    updateHostComponent(vNode)
  }
  if (vNode.child) {
    return vNode.child
  }
  let nextNode: VNode | undefined = vNode
  while (nextNode) {
    if (nextNode.sibling) {
      return nextNode.sibling
    }
    nextNode = nextNode.parent
  }
  return
}

function updateFunctionComponent(vNode: VNode) {
  g.hookIndex = 0
  vNode.hooks = []
  g.curNode = vNode

  const children = [(vNode.type as Function)(vNode.props)].flat()

  reconcileChildren(vNode, children)
}

function updateHostComponent(vNode: VNode) {
  if (!vNode.dom) {
    vNode.dom = createDom(vNode)
  }
  reconcileChildren(vNode, vNode.props.children)
}

function createDom(vNode: VNode): HTMLElement | Text {
  const dom =
    vNode.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(vNode.type as string)

  updateDom(dom, {}, vNode.props)

  return dom
}
const propFilters = {
  internalProps: ["children", "ref"],
  isEvent: (key: string) => key.startsWith("on"),
  isProperty: (key: string) =>
    !propFilters.internalProps.includes(key) && !propFilters.isEvent(key),
  isNew: (prev: Rec, next: Rec) => (key: string) => prev[key] !== next[key],
  isGone: (_prev: Rec, next: Rec) => (key: string) => !(key in next),
}
function updateDom(
  dom: HTMLElement | Text,
  prevProps: Rec,
  nextProps: Rec = {}
) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(propFilters.isEvent)
    .filter(
      (key) =>
        !(key in nextProps) || propFilters.isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(propFilters.isProperty)
    .filter(propFilters.isGone(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(propFilters.isProperty)
    .filter(propFilters.isNew(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(propFilters.isEvent)
    .filter(propFilters.isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

function reconcileChildren(vNode: VNode, children: VNode[]) {
  let index = 0
  let oldNode: VNode | undefined = vNode.prev && vNode.prev.child
  let prevSibling: VNode | undefined = undefined

  if (vNode.type === "article") {
    console.log(vNode)
  }

  while (index < children.length || oldNode != null) {
    const child = children[index]
    let newNode = undefined

    const sameType = oldNode && child && child.type == oldNode.type

    if (sameType) {
      newNode = {
        type: oldNode!.type,
        props: child.props,
        dom: oldNode!.dom,
        parent: vNode,
        prev: oldNode,
        effectTag: "UPDATE",
        hooks: oldNode!.hooks,
      }
    }
    if (child && !sameType) {
      newNode = {
        type: child.type,
        props: child.props,
        dom: undefined,
        parent: vNode,
        prev: undefined,
        effectTag: "PLACEMENT",
        hooks: [],
      }
    }
    if (oldNode && !sameType) {
      oldNode.effectTag = "DELETION"
      g.deletions.push(oldNode)
    }

    if (oldNode) {
      oldNode = oldNode.sibling
    }

    if (index === 0) {
      vNode.child = newNode
    } else if (child && prevSibling) {
      prevSibling.sibling = newNode
    }

    prevSibling = newNode
    index++
  }
}

function commitRoot() {
  g.deletions.forEach(commitWork)
  commitWork(g.wipNode)
  while (g.pendingEffects.length) g.pendingEffects.shift()?.()
  g.wipNode = undefined
}

function commitWork(vNode?: VNode) {
  if (!vNode) return
  let domParentNode = vNode.parent ?? vNode.prev?.parent ?? g.wipNode
  let domParent = domParentNode?.dom
  while (domParentNode && !domParent) {
    domParentNode = domParentNode.parent ?? domParentNode.prev?.parent
    domParent = domParentNode?.dom ?? domParentNode?.prev?.dom
  }

  if (!domParent) {
    console.error("no domParent")
    return
  }

  if (vNode.effectTag === "PLACEMENT" && vNode.dom != null) {
    let sibling = vNode.parent?.sibling?.child?.dom

    if (!sibling) {
      const { idx } = getMountLocation(vNode)
      sibling = domParent.childNodes[idx > 0 ? idx : 0] as HTMLElement
    }

    if (sibling && domParent.contains(sibling)) {
      domParent.insertBefore(vNode.dom, sibling)
    } else {
      domParent.appendChild(vNode.dom)
    }
  } else if (vNode.effectTag === "UPDATE" && vNode.dom != null) {
    updateDom(vNode.dom, vNode.prev?.props ?? {}, vNode.props)
  } else if (vNode.effectTag === "DELETION") {
    commitDeletion(vNode, domParent)
    return
  }

  commitWork(vNode.child)
  commitWork(vNode.sibling)
}

function commitDeletion(vNode: VNode, domParent: HTMLElement | Text) {
  if (vNode.dom && vNode.dom.isConnected) {
    domParent.removeChild(vNode.dom)
  } else if (vNode.child) {
    commitDeletion(vNode.child, domParent)
    let sibling = vNode.child.sibling
    while (sibling) {
      commitDeletion(sibling, domParent)
      sibling = sibling.sibling
    }
  }
}

function getMountLocation(
  vNode: VNode,
  start = -1
): {
  element: HTMLElement | Text | SVGSVGElement | null
  idx: number
} {
  if (!vNode.parent) return { element: null, idx: -1 }

  for (let i = 0; i < vNode.parent.props.children.length; i++) {
    const c = vNode.parent.props.children[i]
    if (vNode === c) {
      break
    }

    start += getRenderedNodeCount(c)
  }

  if (vNode.parent.dom) return { element: vNode.parent.dom, idx: start }

  return getMountLocation(vNode.parent, start)
}

function getRenderedNodeCount(vNode?: VNode): number {
  if (!vNode) return 0
  if (vNode.props.children.length === 0) return 1
  return vNode.props.children.reduce(
    (acc, c) => acc + getRenderedNodeCount(c),
    0
  )
}
