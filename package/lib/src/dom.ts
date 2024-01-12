import type { ElementProps, Rec, VNode } from "./types"
import { stateMap, type GlobalState } from "./globalState.js"
import { propFilters } from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag } from "./constants.js"

export { commitWork, createDom }

export const domMap = new WeakMap<VNode, HTMLElement | SVGElement | Text>()

const svgTags = [
  "svg",
  "clipPath",
  "circle",
  "ellipse",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
]

function createDom(vNode: VNode): HTMLElement | SVGElement | Text {
  const t = vNode.type as string
  let dom =
    t == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : svgTags.includes(t)
      ? (document.createElementNS(
          "http://www.w3.org/2000/svg",
          t
        ) as SVGElement)
      : document.createElement(t)

  if (t === "form") {
    updateFormProps(vNode, dom as HTMLFormElement)
  }

  dom = updateDom(vNode, dom)
  domMap.set(vNode, dom)
  return dom
}

function updateFormProps(vNode: VNode, dom: HTMLFormElement) {
  if (vNode.props.onsubmit || vNode.props.onSubmit) return
  if (!vNode.props.action || !(vNode.props.action instanceof Function)) return

  const action = vNode.props.action
  ;(vNode.props as ElementProps<"form">).onsubmit = (e) => {
    e.preventDefault()
    return action(new FormData(dom))
  }
  vNode.props.action = undefined
}

function updateDom(node: VNode, dom: HTMLElement | SVGElement | Text) {
  const prevProps: Rec = node.prev?.props ?? {}
  const nextProps: Rec = node.props ?? {}
  if (dom instanceof HTMLFormElement) {
    updateFormProps(node, dom)
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
      if (
        name === "style" &&
        typeof nextProps[name] !== "string" &&
        !(dom instanceof Text)
      ) {
        Object.keys(prevProps[name] as Partial<CSSStyleSheet>).forEach(
          (styleName) => {
            ;(dom.style as Rec)[styleName] = ""
          }
        )
        return
      }

      if (dom instanceof SVGElement) {
        dom.removeAttribute(name)
        return
      }

      ;(dom as Rec)[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(propFilters.isProperty)
    .filter(propFilters.isNew(prevProps, nextProps))
    .forEach((name) => {
      if (
        name === "style" &&
        typeof nextProps[name] !== "string" &&
        !(dom instanceof Text)
      ) {
        Object.assign(dom.style, nextProps[name])
        return
      }

      if (dom instanceof SVGElement) {
        dom.setAttribute(name, nextProps[name])
        return
      }
      ;(dom as Rec)[name] = nextProps[name]
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
    commitDeletion(vNode, dom)
    return
  }

  vNode.effectTag = undefined

  vNode.child && commitWork(g, vNode.child)
  vNode.sibling && commitWork(g, vNode.sibling)

  if (vNode.props.ref) {
    vNode.props.ref.current = dom
  }
  vNode.prev = { ...vNode, prev: undefined }
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

function commitDeletion(vNode: VNode, dom = domMap.get(vNode), root = true) {
  if (vNode.type instanceof Function) {
    const hooks = stateMap.get(vNode.id) ?? []
    while (hooks.length > 0) cleanupHook(hooks.pop()!)
    stateMap.delete(vNode.id)
  }

  if (dom) {
    if (dom.isConnected) dom.remove()
    domMap.delete(vNode)
  }
  if (vNode.child) {
    commitDeletion(vNode.child, undefined, false)
    let sibling = vNode.child.sibling
    while (sibling) {
      commitDeletion(sibling, undefined, false)
      sibling = sibling.sibling
    }
  }
  if (vNode.sibling && !root) {
    commitDeletion(vNode.sibling, undefined, false)
  }
}
