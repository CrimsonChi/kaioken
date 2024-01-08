import type { Rec, VNode } from "./types"
import type { GlobalState } from "./globalState.js"
import { propFilters } from "./utils.js"

export { commitWork, createDom }

function createDom(vNode: VNode): HTMLElement | SVGElement | Text {
  const t = vNode.type as string
  const dom =
    t == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : ["svg", "path"].includes(t)
      ? document.createElementNS("http://www.w3.org/2000/svg", t)
      : document.createElement(t)

  return updateDom(dom, {}, vNode.props)
}

function updateDom(
  dom: HTMLElement | SVGElement | Text,
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

  return dom
}

function commitWork(g: GlobalState, vNode: VNode) {
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
    let siblingDom = vNode.sibling?.dom?.isConnected && vNode.sibling?.dom
    let parent = vNode.parent

    while (!siblingDom && parent) {
      siblingDom = findDomRecursive(parent.sibling)
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

  vNode.child && commitWork(g, vNode.child)
  vNode.sibling && commitWork(g, vNode.sibling)
}

function findDomRecursive(
  vNode?: VNode
): HTMLElement | SVGElement | Text | undefined {
  if (vNode?.dom) {
    return vNode.dom
  } else if (vNode?.child) {
    return findDomRecursive(vNode.child)
  } else if (vNode?.sibling) {
    return findDomRecursive(vNode.sibling)
  } else {
    return
  }
}

function callRecursiveCleanup(vNode: VNode) {
  if (vNode.child) {
    callRecursiveCleanup(vNode.child)
  }
  if (vNode.sibling) {
    callRecursiveCleanup(vNode.sibling)
  }
  if (vNode.hooks.length > 0) {
    vNode.hooks.forEach((hook) => {
      if (hook.cleanup) {
        hook.cleanup()
        hook.cleanup = undefined
      }
    })
    vNode.hooks = []
  }
}

function commitDeletion(
  vNode: VNode,
  domParent: HTMLElement | SVGElement | Text
) {
  callRecursiveCleanup(vNode)
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
