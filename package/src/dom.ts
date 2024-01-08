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
  // if ("test" in (vNode.type as {})) debugger
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
  // if (vNode.type === "ul") debugger
  let index = 0
  let oldNode: VNode | undefined = (vNode.prev && vNode.prev.child) ?? undefined
  let prevSibling: VNode | undefined = undefined

  while (index < children.length || oldNode) {
    const child = children[index]
    let newNode = undefined

    const sameType = oldNode && child && child.type == oldNode.type

    if (sameType) {
      const old = oldNode as VNode
      newNode = {
        type: old.type,
        props: child.props,
        dom: old!.dom,
        parent: vNode,
        prev: old,
        effectTag: "UPDATE",
        hooks: old!.hooks,
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
    } else if (prevSibling) {
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
  g.wipNode?.prev && (g.wipNode.prev.child = g.wipNode)
  g.wipNode = undefined
}

function commitWork(vNode?: VNode) {
  if (!vNode) return

  let parentNode = vNode.parent ?? vNode.prev?.parent ?? g.wipNode
  let domParent = parentNode?.dom
  while (parentNode && !domParent) {
    parentNode = parentNode.parent
    domParent = parentNode?.dom
  }

  if (!domParent) {
    console.error("no domParent", vNode)
    return
  }

  if (vNode.effectTag === "PLACEMENT" && vNode.dom != null) {
    let siblingDom = vNode.sibling?.dom
    let parent = vNode.parent

    while (!siblingDom && parent) {
      siblingDom = parent.sibling?.dom ?? parent.sibling?.child?.dom
      parent = parent.parent
    }

    if (siblingDom && domParent.contains(siblingDom)) {
      domParent.insertBefore(vNode.dom, siblingDom)
    } else {
      domParent.appendChild(vNode.dom)
    }
  } else if (vNode.effectTag === "UPDATE" && vNode.dom != null) {
    updateDom(vNode.dom, vNode.prev?.props ?? {}, vNode.props)
  } else if (vNode.effectTag === "DELETION") {
    commitDeletion(vNode, domParent)
    return
  }

  vNode.effectTag = undefined

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
