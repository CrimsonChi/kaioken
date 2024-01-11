import type { VNode } from "./types"
import type { GlobalState } from "./globalState.js"
import { propFilters } from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag } from "./constants.js"

export { commitWork, createDom }

export const domMap = new WeakMap<VNode, HTMLElement | SVGElement | Text>()

function createDom(vNode: VNode): HTMLElement | SVGElement | Text {
  const t = vNode.type as string
  let dom =
    t == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : ["svg", "path"].includes(t)
      ? document.createElementNS("http://www.w3.org/2000/svg", t)
      : document.createElement(t)

  if (t === "form") {
    handleFormBindings(vNode, dom as HTMLFormElement)
  }

  dom = updateDom(vNode, dom)
  domMap.set(vNode, dom)
  return dom
}

function handleFormBindings(vNode: VNode, dom: HTMLFormElement) {
  if (vNode.props.onsubmit || vNode.props.onSubmit) return
  if (!vNode.props.action || !(vNode.props.action instanceof Function)) return

  const action = vNode.props.action
  vNode.props.onSubmit = (e: Event) => {
    e.preventDefault()
    const formData = new FormData(dom)
    return action(formData)
  }
  vNode.props.action = undefined
}

function updateDom(node: VNode, dom: HTMLElement | SVGElement | Text) {
  const prevProps = node.prev?.props ?? {}
  const nextProps = node.props ?? {}
  if (dom instanceof HTMLFormElement) {
    handleFormBindings(node, dom)
  }
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(propFilters.isEvent)
    .filter(
      (key) =>
        !(key in nextProps) || propFilters.isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      // @ts-ignore
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
  const dom = domMap.get(vNode)

  if (vNode.effectTag === EffectTag.PLACEMENT && dom) {
    let parentNode: VNode | undefined =
      vNode.parent ?? vNode.prev?.parent ?? g.treesInProgress[0]
    let domParent = parentNode ? domMap.get(parentNode) : undefined
    while (parentNode && !domParent) {
      parentNode = parentNode.parent
      domParent = parentNode ? domMap.get(parentNode) : undefined
    }

    if (!domParent) {
      console.error("no domParent", vNode)
      return
    }

    let siblingDom: HTMLElement | SVGElement | Text | undefined = undefined
    let tmp = vNode.sibling && domMap.get(vNode.sibling)
    if (tmp && tmp.isConnected) siblingDom = tmp

    let parent = vNode.parent

    while (!siblingDom && parent) {
      siblingDom = findDomRecursive(parent.sibling)
      parent = parent.parent
    }

    if (siblingDom && domParent.contains(siblingDom)) {
      domParent.insertBefore(dom, siblingDom)
    } else {
      domParent.appendChild(dom)
    }
    domMap.set(vNode, dom)
  } else if (vNode.effectTag === EffectTag.UPDATE && dom) {
    updateDom(vNode, dom)
  } else if (vNode.effectTag === EffectTag.DELETION) {
    commitDeletion(vNode)
    vNode.effectTag = undefined
    return
  }

  vNode.effectTag = undefined

  vNode.child && commitWork(g, vNode.child)
  vNode.sibling && commitWork(g, vNode.sibling)

  if (vNode.props.ref) {
    vNode.props.ref.current = dom
  }
  // domMap.delete(vNode)
  vNode.prev = { ...vNode, prev: undefined }
  // if (dom) domMap.set(vNode, dom)
}

function findDomRecursive(
  vNode?: VNode
): HTMLElement | SVGElement | Text | undefined {
  if (!vNode) return
  return (
    domMap.get(vNode) ??
    findDomRecursive(vNode.child) ??
    findDomRecursive(vNode.sibling)
  )
}

function cleanupHooks_Recurse(vNode: VNode) {
  if (vNode.hooks.length > 0) {
    vNode.hooks.forEach(cleanupHook)
    vNode.hooks = []
  }
  if (vNode.child) {
    cleanupHooks_Recurse(vNode.child)
    let sibling = vNode.child.sibling
    while (sibling) {
      cleanupHooks_Recurse(sibling)
      sibling = sibling.sibling
    }
  }
}

function commitDeletion(vNode: VNode) {
  cleanupHooks_Recurse(vNode)
  const dom = domMap.get(vNode)
  if (dom) {
    if (dom.isConnected) dom.remove()
    domMap.delete(vNode)
  }
  if (vNode.child) {
    commitDeletion(vNode.child)
    let sibling = vNode.child.sibling
    while (sibling) {
      commitDeletion(sibling)
      sibling = sibling.sibling
    }
  }
}
