import {
  booleanAttributes,
  propFilters,
  propToHtmlAttr,
  svgTags,
} from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag, elementTypes } from "./constants.js"
import { Component } from "./component.js"
import { Signal } from "./signal.js"
import { renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { MaybeDom, SomeDom, SomeElement } from "./types.dom.js"
import { Portal } from "./portal.js"

export { commitWork, createDom, updateDom, hydrateDom }

type VNode = Kaioken.VNode
type DomParentSearchResult = {
  node: VNode
  element: SomeDom
}
function createDom(vNode: VNode): SomeDom {
  const t = vNode.type as string
  return t == elementTypes.text
    ? document.createTextNode(vNode.props.nodeValue ?? "")
    : svgTags.includes(t)
      ? document.createElementNS("http://www.w3.org/2000/svg", t)
      : document.createElement(t)
}

function updateDom(node: VNode) {
  if (node.instance?.doNotModifyDom) return
  const dom = node.dom as SomeDom
  const prevProps: Record<string, any> = node.prev?.props ?? {}
  const nextProps: Record<string, any> = node.props ?? {}

  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

  keys.forEach((key) => {
    if (key === "innerHTML") {
      return setInnerHTML(node.dom as any, nextProps[key], prevProps[key])
    }

    if (propFilters.internalProps.includes(key)) return

    if (
      propFilters.isEvent(key) &&
      (prevProps[key] !== nextProps[key] || renderMode.current === "hydrate")
    ) {
      const eventType = key.toLowerCase().substring(2)
      if (key in prevProps) dom.removeEventListener(eventType, prevProps[key])
      if (key in nextProps) dom.addEventListener(eventType, nextProps[key])
      return
    }

    if (!(dom instanceof Text) && prevProps[key] !== nextProps[key]) {
      setProp(dom, key, nextProps[key], prevProps[key])
      return
    }
    if (node.prev?.props && prevProps.nodeValue !== nextProps.nodeValue) {
      dom.nodeValue = nextProps.nodeValue
    }
  })
}

function hydrateDom(vNode: VNode) {
  const dom = hydrationStack.nextChild()
  const nodeName = dom?.nodeName.toLowerCase()
  if ((vNode.type as string) !== nodeName) {
    throw new Error(
      `[kaioken]: Hydration mismatch - expected node of type ${vNode.type} but received ${nodeName}`
    )
  }
  vNode.dom = dom
  if (vNode.type !== elementTypes.text) {
    updateDom(vNode)
    return
  }
  let prev = vNode
  let sibling = vNode.sibling
  while (sibling && sibling.type === elementTypes.text) {
    sibling.dom = (prev.dom as Text)!.splitText(prev.props.nodeValue.length)
    prev = sibling
    sibling = sibling.sibling
  }
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

const explicitValueElementTags = ["INPUT", "TEXTAREA", "SELECT"]

const needsExplicitValueSet = (
  dom: SomeElement
): dom is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  return explicitValueElementTags.indexOf(dom.nodeName) > -1
}

function setProp(dom: SomeElement, key: string, value: unknown, prev: unknown) {
  if (key === "style") return setStyleProp(dom, value, prev)
  if (key === "value" && needsExplicitValueSet(dom)) {
    dom.value = String(value)
    return
  }

  setDomAttribute(dom, propToHtmlAttr(key), value)
}

function setInnerHTML(dom: SomeElement, value: unknown, prev: unknown) {
  if (Signal.isSignal(value)) {
    dom.innerHTML = value.toString()
  }
  if (value === prev) return
  if (value === null) {
    dom.innerHTML = ""
    return
  }
  dom.innerHTML = String(value)
}

function setStyleProp(dom: SomeElement, value: unknown, prev: unknown) {
  if (handleAttributeRemoval(dom, "style", value)) return
  if (typeof value === "string" && value !== prev) {
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

  if (prev == null) {
    Object.keys(value as Partial<CSSStyleDeclaration>).forEach(
      (k) => (dom.style[k as any] = value[k as keyof typeof value] as any)
    )
  } else if (typeof prev === "object") {
    Object.keys(value as Partial<CSSStyleDeclaration>).forEach(
      (k) =>
        value[k as keyof typeof value] !== prev[k as keyof typeof prev] &&
        (dom.style[k as any] = value[k as keyof typeof value] as any)
    )
  }
}

function getDomParent(node: VNode): DomParentSearchResult {
  let parentNode: VNode | undefined = node.parent ?? node.prev?.parent
  let parentNodeElement = parentNode?.dom
  while (parentNode && !parentNodeElement) {
    parentNode = parentNode.parent
    parentNodeElement = parentNode?.dom
  }

  if (!parentNodeElement || !parentNode) {
    if (!node.parent) {
      // handle app entry
      if (node.dom) return { node, element: node.dom }
    }

    throw new Error(
      "[kaioken]: no domParent found - seek help!\n" + String(node)
    )
  }
  return { node: parentNode, element: parentNodeElement }
}

function placeDom(
  vNode: VNode,
  mntParent: DomParentSearchResult,
  prevSiblingDom?: MaybeDom
) {
  const dom = vNode.dom as SomeDom
  if (prevSiblingDom) {
    prevSiblingDom.after(dom)
    return
  }
  const { element, node: mountParentNode } = mntParent
  if (element.childNodes.length === 0) {
    element.appendChild(dom)
  } else {
    const stack = [mountParentNode.child]
    let prevDom: MaybeDom

    while (stack.length) {
      const n = stack.pop()!
      const isPortal = Portal.isPortal(n.type)
      if (n.dom === dom) break // once we meet the dom we're placing, stop
      if (!isPortal && n.dom) prevDom = n.dom
      if (n.sibling) stack.push(n.sibling)
      if (!isPortal && !n.dom && n.child) stack.push(n.child)
    }
    if (!prevDom) {
      element.insertBefore(dom, element.firstChild)
    } else {
      prevDom.after(dom)
    }
  }
}

const hostDpStack: [DomParentSearchResult, MaybeDom][] = []
type ElementVNode = VNode & { dom: SomeElement }
function useHostContext(node: ElementVNode): [DomParentSearchResult, MaybeDom] {
  const dp = getDomParent(node)
  let i = hostDpStack.length
  while (i--) {
    if (hostDpStack[i][0].node === dp.node) {
      const prev = hostDpStack[i][1]
      hostDpStack[i][1] = node.dom
      return [hostDpStack[i][0], prev]
    }
  }
  hostDpStack.push([dp, node.dom === dp.element ? undefined : node.dom])
  return [dp, undefined]
}

function resetHostContext() {
  hostDpStack.length = 0
}

function commitWork(vNode: VNode) {
  let commitSibling = false
  const stack: VNode[] = [vNode]
  resetHostContext()

  while (stack.length) {
    const n = stack.pop()!
    const dom = n.dom

    if (dom && n.effectTag !== EffectTag.DELETION) {
      const [mntParent, prevDom] = useHostContext(n as ElementVNode)
      commitDom(n, mntParent, prevDom)
    } else if (n.effectTag === EffectTag.PLACEMENT) {
      // propagate the effect to children
      let c = n.child
      while (c) {
        c.effectTag = EffectTag.PLACEMENT
        c = c.sibling
      }
    }

    if (!n.sibling && !n.child) {
      hostDpStack.pop()
    }

    if (commitSibling) {
      if (n.sibling) {
        stack.push(n.sibling)
      } else if (n.parent && Portal.isPortal(n.parent.type)) {
        hostDpStack.pop()
      }
    }
    commitSibling = true

    if (n.effectTag === EffectTag.DELETION) {
      commitDeletion(n)
      continue
    }

    if (n.child) {
      stack.push(n.child)
    }

    onNodeUpdated(n)
    n.effectTag = undefined
    n.prev = { ...n, props: { ...n.props }, prev: undefined }
  }
}

function onNodeUpdated(n: VNode) {
  const instance = n.instance
  if (instance) {
    const onMounted = instance.componentDidMount?.bind(instance)
    if (!n.prev && onMounted) {
      n.ctx.queueEffect(onMounted)
    } else if (n.effectTag === EffectTag.UPDATE) {
      const onUpdated = instance.componentDidUpdate?.bind(instance)
      if (onUpdated) n.ctx.queueEffect(onUpdated)
    }
    n.ctx.scheduler?.queueCurrentNodeEffects()
  }
}

function commitDom(
  n: VNode,
  mntParent: DomParentSearchResult,
  prevSiblingDom?: MaybeDom
) {
  const dom = n.dom as SomeDom
  if (renderMode.current === "hydrate") {
    if (n.props.ref) {
      n.props.ref.current = dom
    }
    return
  }
  if (n.instance?.doNotModifyDom) return
  if (!dom.isConnected || n.effectTag === EffectTag.PLACEMENT) {
    placeDom(n, mntParent, prevSiblingDom)
  }
  if (n.effectTag === EffectTag.UPDATE) {
    updateDom(n)
  }
  return
}

function commitDeletion(vNode: VNode, deleteSibling = false) {
  const stack: VNode[] = [vNode]
  while (stack.length) {
    const n = stack.pop()!
    let skipDomRemoval = false
    if (Component.isCtor(n.type) && n.instance) {
      n.instance.componentWillUnmount?.()
      if (n.instance.doNotModifyDom) skipDomRemoval = true
    }
    while (n.hooks?.length) cleanupHook(n.hooks.pop()!)
    while (n.subs?.length) Signal.unsubscribeNode(n, n.subs.pop()!)
    if (n.dom?.isConnected && !skipDomRemoval) n.dom.remove()
    delete n.dom
    if (deleteSibling && n.sibling) stack.push(n.sibling)
    if (n.child) stack.push(n.child)
    deleteSibling = true
  }
}
