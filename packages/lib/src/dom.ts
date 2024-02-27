import { type GlobalContext } from "./globalContext.js"
import { propFilters, propToHtmlAttr, svgTags } from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag, elementFreezeSymbol, elementTypes } from "./constants.js"
import { Component } from "./component.js"

export { commitWork, createDom }

type VNode = Kaioken.VNode

function createDom(vNode: VNode): HTMLElement | SVGElement | Text {
  const t = vNode.type as string
  let dom =
    t == elementTypes.text
      ? document.createTextNode("")
      : svgTags.includes(t)
        ? (document.createElementNS(
            "http://www.w3.org/2000/svg",
            t
          ) as SVGElement)
        : document.createElement(t)

  dom = updateDom(vNode, dom)
  vNode.dom = dom
  return dom
}

function updateDom(node: VNode, dom: HTMLElement | SVGElement | Text) {
  const prevProps: Record<string, any> = node.prev?.props ?? {}
  const nextProps: Record<string, any> = node.props ?? {}
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i]
    //Remove old or changed event listeners
    if (
      propFilters.isEvent(key) &&
      (!(key in nextProps) || prevProps[key] !== nextProps[key])
    ) {
      const eventType = key.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[key])
      continue
    }
    // Remove old properties
    if (propFilters.isProperty(key) && !(key in nextProps)) {
      if (
        key === "style" &&
        typeof nextProps[key] !== "string" &&
        !(dom instanceof Text)
      ) {
        Object.keys(prevProps[key] as Partial<CSSStyleSheet>).forEach(
          (styleName) => {
            ;(dom.style as any)[styleName] = ""
          }
        )
        continue
      }

      if (!(dom instanceof Text)) {
        dom.removeAttribute(propToHtmlAttr(key.toLowerCase()))
      }
    }
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    // Set new or changed properties
    if (propFilters.isProperty(key) && prevProps[key] !== nextProps[key]) {
      if (
        key === "style" &&
        typeof nextProps[key] !== "string" &&
        !(dom instanceof Text)
      ) {
        Object.assign(dom.style, nextProps[key])
        continue
      }

      if (
        dom instanceof SVGElement ||
        (dom instanceof Element && key.includes("-"))
      ) {
        dom.setAttribute(propToHtmlAttr(key.toLowerCase()), nextProps[key])
        continue
      }
      ;(dom as any)[key] = nextProps[key]
      continue
    }
    // Add event listeners
    if (propFilters.isEvent(key) && prevProps[key] !== nextProps[key]) {
      const eventType = key.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[key])
    }
  }

  return dom
}

function commitWork(ctx: GlobalContext, vNode: VNode) {
  const dom = vNode.dom ?? vNode.instance?.rootDom
  const frozen = elementFreezeSymbol in vNode && !!vNode[elementFreezeSymbol]
  if (
    dom &&
    (!dom.isConnected ||
      (vNode.effectTag === EffectTag.PLACEMENT && !vNode.instance?.rootDom))
  ) {
    // find mountable parent dom
    let parentNode: VNode | undefined = vNode.parent ?? vNode.prev?.parent
    let domParent = parentNode?.instance?.rootDom ?? parentNode?.dom
    while (parentNode && !domParent) {
      parentNode = parentNode.parent
      domParent = parentNode?.instance?.rootDom ?? parentNode?.dom
    }

    if (!domParent) {
      console.error("[kaioken]: no domParent found - seek help!", vNode)
      return
    }

    let siblingDom: HTMLElement | SVGElement | Text | undefined = undefined
    let tmp = vNode.sibling && vNode.sibling.dom
    if (tmp && tmp.isConnected) {
      siblingDom = tmp
    } else {
      // try to find sibling dom by traversing upwards through the tree
      let parent = vNode.parent
      while (!siblingDom && parent) {
        siblingDom = findDomRecursive(parent.sibling)
        parent = parent.parent
      }
    }

    if (siblingDom && domParent.contains(siblingDom)) {
      domParent.insertBefore(dom, siblingDom)
    } else {
      domParent.appendChild(dom)
    }
  } else if (!frozen && vNode.effectTag === EffectTag.UPDATE && dom) {
    updateDom(vNode, dom)
  } else if (vNode.effectTag === EffectTag.DELETION) {
    commitDeletion(vNode, dom)
    return
  }

  vNode.effectTag = undefined

  !frozen && vNode.child && commitWork(ctx, vNode.child)
  vNode.sibling && commitWork(ctx, vNode.sibling)
  const instance = vNode.instance
  if (instance) {
    const onMounted = instance.componentDidMount?.bind(instance)
    if (!vNode.prev && onMounted) {
      ctx.queueEffect(() => onMounted())
    } else if (!frozen && EffectTag.UPDATE) {
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
