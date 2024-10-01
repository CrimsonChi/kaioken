import {
  traverseApply,
  booleanAttributes,
  commitSnapshot,
  propFilters,
  propToHtmlAttr,
  svgTags,
  postOrderApply,
} from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { ELEMENT_TYPE, FLAG } from "./constants.js"
import { Signal, unwrap } from "./signal.js"
import { ctx, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { MaybeDom, SomeDom, SomeElement, StyleObject } from "./types.dom.js"
import { isPortal } from "./portal.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { bitmapOps } from "./bitmap.js"

export { commitWork, createDom, updateDom, hydrateDom }

type VNode = Kaioken.VNode
type ElementVNode = VNode & { dom: SomeElement }
type DomVNode = VNode & { dom: SomeDom }
type HostNode = {
  node: ElementVNode
  lastChild?: DomVNode
}

function setDomRef(vNode: VNode, value: SomeDom | null) {
  if (!vNode.props.ref) return
  if (typeof vNode.props.ref === "function") {
    vNode.props.ref(value)
    return
  }
  if (Signal.isSignal(vNode.props.ref)) {
    vNode.props.ref.sneak(value)
    vNode.props.ref.notify({
      filter: (sub) => typeof sub === "function",
    })
    return
  }
  ;(vNode.props.ref as Kaioken.MutableRefObject<SomeDom | null>).current = value
}

function createDom(vNode: VNode): SomeDom {
  const t = vNode.type as string
  const dom =
    t == ELEMENT_TYPE.text
      ? createTextNode(vNode)
      : svgTags.includes(t)
        ? document.createElementNS("http://www.w3.org/2000/svg", t)
        : document.createElement(t)
  setDomRef(vNode, dom)
  return dom
}
function createTextNode(vNode: VNode): Text {
  const prop = vNode.props.nodeValue
  const isSig = Signal.isSignal(prop)
  const value = unwrap(prop)
  const el = document.createTextNode(value)
  if (isSig) {
    subTextNode(vNode, el, prop)
  }
  return el
}

function updateDom(vNode: VNode) {
  if (isPortal(vNode)) return
  const dom = vNode.dom as SomeDom
  const prevProps: Record<string, any> = vNode.prev?.props ?? {}
  const nextProps: Record<string, any> = vNode.props ?? {}

  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

  keys.forEach((key) => {
    if (key === "innerHTML") {
      return setInnerHTML(vNode.dom as any, nextProps[key], prevProps[key])
    }

    if (propFilters.internalProps.includes(key)) return

    if (propFilters.isEvent(key)) {
      if (
        prevProps[key] !== nextProps[key] ||
        renderMode.current === "hydrate"
      ) {
        const eventType = key.toLowerCase().substring(2)
        if (key in prevProps) dom.removeEventListener(eventType, prevProps[key])
        if (key in nextProps) dom.addEventListener(eventType, nextProps[key])
      }
      return
    }

    if (!(dom instanceof Text)) {
      if (prevProps[key] === nextProps[key]) return
      if (Signal.isSignal(prevProps[key]) && vNode.cleanups) {
        vNode.cleanups[key] &&
          (vNode.cleanups[key](), delete vNode.cleanups[key])
      }
      if (Signal.isSignal(nextProps[key])) {
        const unsub = nextProps[key].subscribe((v) => {
          setProp(vNode, dom, key, v, unwrap(vNode.prev?.props[key]))
          emitGranularSignalChange(nextProps[key])
        })
        ;(vNode.cleanups ??= {})[key] = unsub
        return setProp(
          vNode,
          dom,
          key,
          nextProps[key].peek(),
          unwrap(prevProps[key])
        )
      }
      setProp(vNode, dom, key, nextProps[key], prevProps[key])
      return
    }
    const nodeVal = unwrap(nextProps[key])
    if (dom.nodeValue !== nodeVal) {
      dom.nodeValue = nodeVal
    }
  })
}

function emitGranularSignalChange(signal: Signal<any>) {
  if (__DEV__) {
    if (Signal.subscribers(signal).size === 1) {
      window.__kaioken?.emit("update", ctx.current)
    }
  }
}

function subTextNode(vNode: VNode, textNode: Text, signal: Signal<string>) {
  const unsub = signal.subscribe((v) => {
    textNode.nodeValue = v
    emitGranularSignalChange(signal)
  })
  ;(vNode.cleanups ??= {})["nodeValue"] = unsub
}

function hydrateDom(vNode: VNode) {
  const dom = hydrationStack.nextChild()
  if (!dom)
    throw new KaiokenError({
      message: `Hydration mismatch - no node found`,
      vNode,
    })
  const nodeName = dom.nodeName.toLowerCase()
  if ((vNode.type as string) !== nodeName) {
    throw new KaiokenError({
      message: `Hydration mismatch - expected node of type ${vNode.type.toString()} but received ${nodeName}`,
      vNode,
    })
  }
  vNode.dom = dom
  setDomRef(vNode, dom)
  if (vNode.type !== ELEMENT_TYPE.text) {
    updateDom(vNode)
    return
  }
  if (Signal.isSignal(vNode.props.nodeValue)) {
    subTextNode(vNode, dom as Text, vNode.props.nodeValue)
  }

  let prev = vNode
  let sibling = vNode.sibling
  while (sibling && sibling.type === ELEMENT_TYPE.text) {
    const sib = sibling
    hydrationStack.bumpChildIndex()
    const prevText = String(unwrap(prev.props.nodeValue) ?? "")
    const dom = (prev.dom as Text).splitText(prevText.length)
    sib.dom = dom
    if (Signal.isSignal(sib.props.nodeValue)) {
      subTextNode(sib, dom, sib.props.nodeValue)
    }
    prev = sibling
    sibling = sibling.sibling
  }
}

function handleAttributeRemoval(
  element: Element,
  key: string,
  value: unknown,
  isBoolAttr = false
) {
  if (value === null) {
    element.removeAttribute(key)
    return true
  }
  switch (typeof value) {
    case "undefined":
    case "function":
    case "symbol": {
      element.removeAttribute(key)
      return true
    }
    case "boolean": {
      if (isBoolAttr && !value) {
        element.removeAttribute(key)
        return true
      }
    }
  }

  return false
}

export function setDomAttribute(element: Element, key: string, value: unknown) {
  const isBoolAttr = booleanAttributes.includes(key)

  if (handleAttributeRemoval(element, key, value, isBoolAttr)) return

  element.setAttribute(
    key,
    isBoolAttr && typeof value === "boolean" ? "" : String(value)
  )
}

const explicitValueElementTags = ["INPUT", "TEXTAREA", "SELECT"]

const needsExplicitValueSet = (
  element: SomeElement
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  return explicitValueElementTags.indexOf(element.nodeName) > -1
}

function setProp(
  vNode: VNode,
  element: SomeElement,
  key: string,
  value: unknown,
  prev: unknown
) {
  if (key === "style") return setStyleProp(vNode, element, value, prev)
  if (key === "value" && needsExplicitValueSet(element)) {
    element.value = String(value)
    return
  }

  setDomAttribute(element, propToHtmlAttr(key), value)
}

function setInnerHTML(element: SomeElement, value: unknown, prev: unknown) {
  if (Signal.isSignal(value)) {
    element.innerHTML = value.toString()
  }
  if (value === prev) return
  if (value === null) {
    element.innerHTML = ""
    return
  }
  element.innerHTML = String(value)
}

function setStyleProp(
  vNode: VNode,
  element: SomeElement,
  value: unknown,
  prev: unknown
) {
  if (typeof value !== typeof prev) {
    if (typeof prev === "object" && prev !== null) {
      delete vNode.prevStyleObj
    } else if (typeof prev === "string") {
      delete vNode.prevStyleStr
    }
  }
  if (handleAttributeRemoval(element, "style", value)) return
  switch (typeof value) {
    case "string":
      if (value === vNode.prevStyleStr) return
      element.setAttribute("style", value)
      vNode.prevStyleStr = value
      break
    case "object":
      const style = vNode.prevStyleObj ?? {}
      Object.entries(value as object).forEach(([k, v]) => {
        if (style[k as keyof typeof style] !== v) {
          style[k as keyof typeof style] = v
          element.style[k as any] = v
        }
      })
      Object.keys(style).forEach((k) => {
        if (!(k in (value as object))) {
          delete style[k as keyof StyleObject]
          element.style[k as any] = ""
        }
      })
      vNode.prevStyleObj = style
      break
    default:
      break
  }
}

function getDomParent(vNode: VNode): ElementVNode {
  let parentNode: VNode | undefined = vNode.parent ?? vNode.prev?.parent
  let parentNodeElement = parentNode?.dom
  while (parentNode && !parentNodeElement) {
    parentNode = parentNode.parent
    parentNodeElement = parentNode?.dom
  }

  if (!parentNodeElement || !parentNode) {
    if (!vNode.parent) {
      // handle app entry
      if (vNode.dom) return vNode as ElementVNode
    }

    throw new KaiokenError({
      message: "No DOM parent found while attempting to place node.",
      vNode: vNode,
    })
  }
  return parentNode as ElementVNode
}

function placeDom(
  dom: SomeDom,
  mntParent: ElementVNode,
  prevSiblingDom?: SomeDom
) {
  if (prevSiblingDom) {
    prevSiblingDom.after(dom)
    return
  }
  if (isPortal(mntParent) && !dom.isConnected) {
    mntParent.dom.appendChild(dom)
    return
  }
  if (mntParent.dom.childNodes.length === 0) {
    mntParent.dom.appendChild(dom)
  } else {
    /**
     * scan depth-first through the tree from the mount parent
     * and find the previous dom node (if any)
     */
    const stack = [mntParent.child]
    let prevDom: MaybeDom

    while (stack.length) {
      const n = stack.pop()!
      const _isPortal = isPortal(n)
      if (n.dom === dom) break // once we meet the dom we're placing, stop
      if (!_isPortal && n.dom?.isConnected) prevDom = n.dom
      if (n.sibling) stack.push(n.sibling)
      if (!_isPortal && !n.dom && n.child) stack.push(n.child)
    }
    if (!prevDom) {
      mntParent.dom.insertBefore(dom, mntParent.dom.firstChild)
    } else {
      prevDom.after(dom)
    }
  }
}

function commitWork(vNode: VNode) {
  if (renderMode.current === "hydrate") {
    return traverseApply(vNode, commitSnapshot)
  }
  if (bitmapOps.isFlagSet(vNode, FLAG.DELETION)) {
    return commitDeletion(vNode)
  }

  const hostNodes: HostNode[] = []
  postOrderApply(vNode, {
    onDescent: (node) => {
      if (!node.child) return
      if (node.dom) {
        // collect host nodes as we go
        hostNodes.push({ node: node as ElementVNode })
      } else if (bitmapOps.isFlagSet(node, FLAG.PLACEMENT)) {
        // no dom node, propagate the flag down the tree.
        // we shouldn't need to do this if we were to instead
        // treat the placement flag as a modifier that affects
        // operations on children during this iteration
        let child: VNode | undefined = node.child
        while (child) {
          bitmapOps.setFlag(child, FLAG.PLACEMENT)
          child = child.sibling
        }
      }
    },
    onAscent: (node) => {
      if (bitmapOps.isFlagSet(node, FLAG.DELETION)) {
        return commitDeletion(node)
      }
      if (node.dom) {
        commitDom(node as DomVNode, hostNodes)
      }
      commitSnapshot(node)
    },
    onBeforeAscent(node) {
      if (hostNodes[hostNodes.length - 1]?.node === node.parent) {
        hostNodes.pop()
      }
    },
  })
}

function commitDom(vNode: DomVNode, hostNodes: HostNode[]) {
  if (isPortal(vNode)) return
  const host = hostNodes[hostNodes.length - 1]
  if (!vNode.dom.isConnected || bitmapOps.isFlagSet(vNode, FLAG.PLACEMENT)) {
    const parent = host?.node ?? getDomParent(vNode)
    placeDom(vNode.dom, parent, host?.lastChild?.dom)
  }
  if (!vNode.prev || bitmapOps.isFlagSet(vNode, FLAG.UPDATE)) {
    updateDom(vNode)
  }
  if (host) {
    host.lastChild = vNode
  }
}

function commitDeletion(vNode: VNode) {
  if (vNode === vNode.parent?.child) {
    vNode.parent.child = vNode.sibling
  }
  traverseApply(vNode, (n) => {
    while (n.hooks?.length) cleanupHook(n.hooks.pop()!)
    while (n.subs?.length) Signal.unsubscribe(n, n.subs.pop()!)
    n.cleanups && Object.values(n.cleanups).forEach((c) => c())
    delete n.cleanups

    if (n.dom) {
      if (n.dom.isConnected && !isPortal(n)) n.dom.remove()
      delete n.dom
      setDomRef(n, null)
    }
  })
}
