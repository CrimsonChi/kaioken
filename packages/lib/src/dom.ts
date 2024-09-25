import {
  booleanAttributes,
  propFilters,
  propToHtmlAttr,
  svgTags,
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

function updateDom(node: VNode) {
  if (isPortal(node)) return
  const dom = node.dom as SomeDom
  const prevProps: Record<string, any> = node.prev?.props ?? {}
  const nextProps: Record<string, any> = node.props ?? {}

  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

  keys.forEach((key) => {
    if (key === "innerHTML") {
      return setInnerHTML(node.dom as any, nextProps[key], prevProps[key])
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
      if (Signal.isSignal(prevProps[key]) && node.cleanups) {
        node.cleanups[key] && (node.cleanups[key](), delete node.cleanups[key])
      }
      if (Signal.isSignal(nextProps[key])) {
        const unsub = nextProps[key].subscribe((v) => {
          setProp(node, dom, key, v, unwrap(node.prev?.props[key]))
          emitGranularSignalChange(nextProps[key])
        })
        ;(node.cleanups ??= {})[key] = unsub
        return setProp(
          node,
          dom,
          key,
          nextProps[key].peek(),
          unwrap(prevProps[key])
        )
      }
      setProp(node, dom, key, nextProps[key], prevProps[key])
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

function subTextNode(node: Kaioken.VNode, dom: Text, sig: Signal<string>) {
  const unsub = sig.subscribe((v) => {
    dom.nodeValue = v
    emitGranularSignalChange(sig)
  })
  ;(node.cleanups ??= {})["nodeValue"] = unsub
}

function hydrateDom(vNode: VNode) {
  const dom = hydrationStack.nextChild()
  if (!dom)
    throw new KaiokenError(`[kaioken]: Hydration mismatch - no node found`)
  const nodeName = dom.nodeName.toLowerCase()
  if ((vNode.type as string) !== nodeName) {
    throw new KaiokenError(
      `[kaioken]: Hydration mismatch - expected node of type ${vNode.type.toString()} but received ${nodeName}`
    )
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

  dom.setAttribute(
    key,
    isBoolAttr && typeof value === "boolean" ? "" : String(value)
  )
}

const explicitValueElementTags = ["INPUT", "TEXTAREA", "SELECT"]

const needsExplicitValueSet = (
  dom: SomeElement
): dom is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  return explicitValueElementTags.indexOf(dom.nodeName) > -1
}

function setProp(
  node: VNode,
  dom: SomeElement,
  key: string,
  value: unknown,
  prev: unknown
) {
  if (key === "style") return setStyleProp(node, dom, value, prev)
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

function setStyleProp(
  node: VNode,
  dom: SomeElement,
  value: unknown,
  prev: unknown
) {
  if (typeof value !== typeof prev) {
    if (typeof prev === "object" && prev !== null) {
      delete node.prevStyleObj
    } else if (typeof prev === "string") {
      delete node.prevStyleStr
    }
  }
  if (handleAttributeRemoval(dom, "style", value)) return
  switch (typeof value) {
    case "string":
      if (value === node.prevStyleStr) return
      dom.setAttribute("style", value)
      node.prevStyleStr = value
      break
    case "object":
      const style = node.prevStyleObj ?? {}
      Object.entries(value as object).forEach(([k, v]) => {
        if (style[k as keyof typeof style] !== v) {
          style[k as keyof typeof style] = v
          dom.style[k as any] = v
        }
      })
      Object.keys(style).forEach((k) => {
        if (!(k in (value as object))) {
          delete style[k as keyof StyleObject]
          dom.style[k as any] = ""
        }
      })
      node.prevStyleObj = style
      break
    default:
      break
  }
}

function getDomParent(node: VNode): ElementVNode {
  let parentNode: VNode | undefined = node.parent ?? node.prev?.parent
  let parentNodeElement = parentNode?.dom
  while (parentNode && !parentNodeElement) {
    parentNode = parentNode.parent
    parentNodeElement = parentNode?.dom
  }

  if (!parentNodeElement || !parentNode) {
    if (!node.parent) {
      // handle app entry
      if (node.dom) return node as ElementVNode
    }

    throw new KaiokenError(
      "[kaioken]: no domParent found - seek help!\n" + String(node)
    )
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
      if (!_isPortal && n.dom) prevDom = n.dom
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
  if (bitmapOps.isFlagSet(vNode, FLAG.DELETION)) {
    return commitDeletion(vNode)
  }

  // perform a depth-first crawl through the tree, starting from the root.
  // we accumulate a stack of 'host node -> last child' as we go,
  // so that we can reuse them in the next iteration.
  const root = vNode
  const hostNodes: HostNode[] = []
  let branch = root.child
  while (branch) {
    let node = branch
    // traverse the tree in a depth first manner,
    // collecting host nodes as we go
    while (node) {
      if (node.dom && node.type !== ELEMENT_TYPE.text && node.child) {
        hostNodes.push({
          node: node as ElementVNode,
        })
      }
      if (!node.child) break
      if (!node.dom && bitmapOps.isFlagSet(node, FLAG.PLACEMENT)) {
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
      node = node.child
    }
    while (node && node !== root) {
      // at this point we're operating on the deepest nodes,
      // traversing back up the tree until we reach a new branch
      // or the root.
      if (bitmapOps.isFlagSet(node, FLAG.DELETION)) {
        commitDeletion(node)
      } else {
        if (node.dom) {
          commitDom(node as DomVNode, hostNodes)
        }
        node.flags = 0
        node.prev = { ...node, props: { ...node.props }, prev: undefined }
      }
      if (node.sibling) {
        branch = node.sibling
        break
      }
      if (hostNodes[hostNodes.length - 1]?.node === node.parent) {
        hostNodes.pop()
      }
      node = node.parent!
    }
    if (node === root) break
  }
}

function commitDom(node: DomVNode, hostNodes: HostNode[]) {
  if (isPortal(node)) return
  const host = hostNodes[hostNodes.length - 1]
  if (!node.dom.isConnected || bitmapOps.isFlagSet(node, FLAG.PLACEMENT)) {
    const parent = host?.node ?? getDomParent(node)
    placeDom(node.dom, parent, host?.lastChild?.dom)
  }
  if (!node.prev || bitmapOps.isFlagSet(node, FLAG.UPDATE)) {
    updateDom(node)
  }
  if (host) {
    host.lastChild = node
  }
}

function commitDeletion(vNode: VNode, deleteSibling = false) {
  if (vNode === vNode.parent?.child) {
    vNode.parent.child = vNode.sibling
  }
  const stack: VNode[] = [vNode]
  while (stack.length) {
    const n = stack.pop()!
    while (n.hooks?.length) cleanupHook(n.hooks.pop()!)
    while (n.subs?.length) Signal.unsubscribe(n, n.subs.pop()!)
    n.cleanups && Object.values(n.cleanups).forEach((c) => c())
    delete n.cleanups

    if (n.dom) {
      if (n.dom.isConnected && !isPortal(n)) n.dom.remove()
      delete n.dom
      setDomRef(n, null)
    }
    if (deleteSibling && n.sibling) stack.push(n.sibling)
    if (n.child) stack.push(n.child)
    deleteSibling = true
  }
}
