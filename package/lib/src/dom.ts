import type { ElementProps, Rec, VNode } from "./types"
import { type GlobalContext } from "./globalContext.js"
import { propFilters } from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag } from "./constants.js"
import { Component } from "./component.js"

export { commitWork, createDom }

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
  vNode.dom = dom
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

      if (
        dom instanceof SVGElement ||
        (dom instanceof Element && name.includes("-"))
      ) {
        dom.removeAttribute(name.toLowerCase() === "classname" ? "class" : name)
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

      if (
        dom instanceof SVGElement ||
        (dom instanceof Element && name.includes("-"))
      ) {
        dom.setAttribute(
          name.toLowerCase() === "classname" ? "class" : name,
          nextProps[name]
        )
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

function commitWork(ctx: GlobalContext, vNode: VNode) {
  const dom = vNode.dom ?? vNode.instance?.rootDom

  if (
    vNode.effectTag === EffectTag.PLACEMENT &&
    dom &&
    !vNode.instance?.rootDom
  ) {
    let parentNode: VNode | undefined =
      vNode.parent ?? vNode.prev?.parent ?? ctx.treesInProgress[0]
    let domParent = parentNode
      ? parentNode.instance?.rootDom ?? parentNode.dom
      : undefined
    while (parentNode && !domParent) {
      parentNode = parentNode.parent
      domParent = parentNode
        ? parentNode.instance?.rootDom ?? parentNode.dom
        : undefined
    }

    if (!domParent) {
      console.error("no domParent", vNode)
      return
    }

    let siblingDom: HTMLElement | SVGElement | Text | undefined = undefined
    let tmp = vNode.sibling && vNode.sibling.dom
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
    vNode.dom
  } else if (vNode.effectTag === EffectTag.UPDATE && dom) {
    updateDom(vNode, dom)
  } else if (vNode.effectTag === EffectTag.DELETION) {
    commitDeletion(vNode, dom)
    return
  }

  vNode.effectTag = undefined

  vNode.child && commitWork(ctx, vNode.child)
  vNode.sibling && commitWork(ctx, vNode.sibling)
  const instance = vNode.instance
  if (instance) {
    const onMounted = instance.componentDidMount?.bind(instance)
    if (!vNode.prev && onMounted) {
      ctx.queueEffect(() => onMounted())
    } else if (EffectTag.UPDATE) {
      const onUpdated = instance.componentDidUpdate?.bind(instance)
      if (onUpdated) ctx.queueEffect(() => onUpdated())
    }
  }

  if (vNode.props.ref && dom) {
    vNode.props.ref.current = dom
  }
  vNode.prev = { ...vNode, prev: undefined }
}

function findDomRecursive(
  vNode?: VNode
): HTMLElement | SVGElement | Text | undefined {
  if (!vNode) return
  return (
    vNode.dom ??
    findDomRecursive(vNode.child) ??
    findDomRecursive(vNode.sibling)
  )
}

function commitDeletion(vNode: VNode, dom = vNode.dom, root = true) {
  if (Component.isCtor(vNode.type) && vNode.instance) {
    vNode.instance.componentWillUnmount?.()
  } else if (vNode.type instanceof Function) {
    while (vNode.hooks?.length) cleanupHook(vNode.hooks.pop()!)
  }

  if (dom) {
    if (dom.isConnected && vNode.instance?.rootDom !== dom) dom.remove()
    delete vNode.dom
  }
  if (vNode.child) {
    commitDeletion(vNode.child, undefined, false)
  }
  if (vNode.sibling && !root) {
    commitDeletion(vNode.sibling, undefined, false)
  }
}
