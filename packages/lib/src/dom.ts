import { type GlobalContext } from "./globalContext.js"
import {
  booleanAttributes,
  propFilters,
  propToHtmlAttr,
  svgTags,
} from "./utils.js"
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

function handleAttributeRemoval(
  dom: Element,
  key: string,
  value: unknown,
  isBoolAttr = false
) {
  if (value === null) {
    dom.removeAttribute(key)
    return true
  }
  switch (typeof value) {
    case "undefined":
    case "function":
    case "symbol": {
      dom.removeAttribute(key)
      return true
    }
    case "boolean": {
      if (isBoolAttr && !value) {
        dom.removeAttribute(key)
        return true
      }
    }
  }

  return false
}

export function setDomAttribute(dom: Element, key: string, value: unknown) {
  const isBoolAttr = booleanAttributes.includes(key)

  if (handleAttributeRemoval(dom, key, value, isBoolAttr)) return

  dom.setAttribute(key, isBoolAttr ? "" : String(value))
}

function setProp(
  dom: HTMLElement | SVGElement,
  key: string,
  value: unknown,
  prev: unknown
) {
  switch (key) {
    case "style":
      setStyleProp(dom, value, prev)
      break
    default:
      setDomAttribute(dom, propToHtmlAttr(key), value)
  }
}

function setStyleProp(
  dom: HTMLElement | SVGElement,
  value: unknown,
  prev: unknown
) {
  if (handleAttributeRemoval(dom, "style", value)) return
  if (typeof value === "string") {
    dom.setAttribute("style", value)
    return
  }

  if (
    !!prev &&
    typeof prev === "object" &&
    !!value &&
    typeof value === "object"
  ) {
    Object.keys(prev).forEach((k) => {
      if (!(k in value)) dom.style[k as any] = ""
    })
  }

  if (typeof value !== "object" || !value) return

  Object.keys(value as Partial<CSSStyleDeclaration>).forEach(
    (k) => (dom.style[k as any] = value[k as keyof typeof value] as any)
  )
}

function updateDom(node: VNode, dom: HTMLElement | SVGElement | Text) {
  const prevProps: Record<string, any> = node.prev?.props ?? {}
  const nextProps: Record<string, any> = node.props ?? {}

  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

  keys.forEach((key) => {
    if (propFilters.internalProps.includes(key)) return

    if (propFilters.isEvent(key) && prevProps[key] !== nextProps[key]) {
      const eventType = key.toLowerCase().substring(2)
      if (!(key in nextProps)) {
        dom.removeEventListener(eventType, prevProps[key])
      } else {
        if (key in prevProps) dom.removeEventListener(eventType, prevProps[key])
        if (key in nextProps) dom.addEventListener(eventType, nextProps[key])
      }
      return
    }

    if (!(dom instanceof Text)) {
      setProp(dom, key, nextProps[key], prevProps[key])
      return
    }

    ;(dom as any)[key] = nextProps[key]
  })

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
