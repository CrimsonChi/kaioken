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
import { Signal, unwrap } from "./signals"
import { ctx, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { StyleObject } from "./types.dom.js"
import { isPortal } from "./portal.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { bitmapOps } from "./bitmap.js"
import type {
  DomVNode,
  ElementVNode,
  MaybeDom,
  SomeDom,
  SomeElement,
} from "./types.utils"

export { commitWork, createDom, updateDom, hydrateDom }

type VNode = Kaioken.VNode
type HostNode = {
  node: ElementVNode
  lastChild?: DomVNode
}
type PlacementScope = {
  parent: VNode
  active: boolean
  child?: VNode
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
  const value = unwrap(prop)
  const textNode = document.createTextNode(value)
  if (Signal.isSignal(prop)) {
    subTextNode(vNode, textNode, prop)
  }
  return textNode
}

/**
 * toggled when we fire a focus event on an element
 * persist focus when the currently focused element is moved.
 */
let persistingFocus = false

// gets set prior to dom commits
let currentActiveElement: Element | null = null

let didBlurActiveElement = false
const placementBlurHandler = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  didBlurActiveElement = true
}

function handlePrePlacementFocusPersistence() {
  persistingFocus = true
  currentActiveElement = document.activeElement
  if (currentActiveElement && currentActiveElement !== document.body) {
    currentActiveElement.addEventListener("blur", placementBlurHandler)
  }
}

function handlePostPlacementFocusPersistence() {
  if (!didBlurActiveElement) {
    persistingFocus = false
    return
  }
  currentActiveElement?.removeEventListener("blur", placementBlurHandler)
  if (currentActiveElement?.isConnected) {
    if ("focus" in currentActiveElement) (currentActiveElement as any).focus()
  }
  persistingFocus = false
}

function wrapFocusEventHandler(callback: (event: FocusEvent) => void) {
  return (event: FocusEvent) => {
    if (persistingFocus) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    callback(event)
  }
}

type WrappedFocusEventMap = {
  onfocus?: (event: FocusEvent) => void
  onblur?: (event: FocusEvent) => void
}

const vNodeToWrappedFocusEventHandlersMap = new WeakMap<
  VNode,
  WrappedFocusEventMap
>()

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
        if (key in prevProps) {
          let cb = prevProps[key]
          if (key === "onfocus" || key === "onblur") {
            cb = vNodeToWrappedFocusEventHandlersMap.get(vNode)?.[key]
          }
          dom.removeEventListener(eventType, cb)
        }
        if (key in nextProps) {
          let cb = nextProps[key]
          if (key === "onfocus" || key === "onblur") {
            cb = wrapFocusEventHandler(cb)
            const wrappedHandlers =
              vNodeToWrappedFocusEventHandlersMap.get(vNode) ?? {}
            wrappedHandlers[key] = cb
            vNodeToWrappedFocusEventHandlersMap.set(vNode, wrappedHandlers)
          }
          dom.addEventListener(eventType, cb)
        }
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
        const cb: (v: any) => void = (v: any) => {
          setProp(vNode, dom, key, v, unwrap(vNode.prev?.props[key]))
          emitGranularSignalChange(nextProps[key])
        }
        const unsub = nextProps[key].subscribe(cb)
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
    if (Signal.isSignal(nextProps[key])) {
      // signal textNodes are handled via 'subTextNode'.
      return
    }
    const nodeVal = nextProps[key]
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
  const cb: (v: any) => void = (v) => {
    textNode.nodeValue = v
    emitGranularSignalChange(signal)
  }
  const unsub = signal.subscribe(cb)
  ;(vNode.cleanups ??= {})["nodeValue"] = () => {
    console.log(signal.displayName, "is text node unsubbing")
    unsub()
  }
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
  vNode: DomVNode,
  mntParent: ElementVNode,
  prevSiblingDom?: SomeDom
) {
  const dom = vNode.dom
  if (prevSiblingDom) {
    prevSiblingDom.after(dom)
    return
  }
  if (mntParent.dom.childNodes.length === 0) {
    mntParent.dom.appendChild(dom)
  } else {
    /**
     * scan from vNode, up, down, then right to find previous dom
     */
    let prevDom: MaybeDom
    let parent = vNode.parent!
    let child = parent.child
    const seenParents = new Set<VNode>()
    const branchStack: VNode[] = []
    while (child && parent.depth >= mntParent.depth) {
      if (child === vNode) {
        if (prevDom) break
        seenParents.add(parent)
        parent = parent.parent!
        child = parent?.child
        continue
      }

      const isPortalRoot = isPortal(child)

      const dom = child.dom
      if (dom?.isConnected && !isPortalRoot) prevDom = child.dom

      if (prevDom && branchStack.length) {
        child = branchStack.pop()!
        parent = child.parent!
        continue
      }

      if (
        !dom &&
        child.child &&
        // prevent re-traversing our 'frontier'
        !seenParents.has(child) &&
        // prevent traversing downward through portals
        !isPortalRoot
      ) {
        // if there's a sibling, add a 'checkpoint' that we can return to
        if (child.sibling) {
          branchStack.push(child.sibling)
        }
        parent = child
        child = parent.child
        continue
      }

      if (
        child.sibling &&
        // prevent traversing forward through siblings of our upward crawl
        !seenParents.has(child)
      ) {
        child = child.sibling
        continue
      }

      if (prevDom && parent === vNode.parent) {
        break
      }

      seenParents.add(parent)
      parent = parent.parent!
      child = parent?.child
    }

    if (!prevDom) {
      //mntParent.dom.prepend(dom) ?
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
  handlePrePlacementFocusPersistence()

  const hostNodes: HostNode[] = []
  let currentHostNode: HostNode | undefined
  const placementScopes: PlacementScope[] = []
  let currentPlacementScope: PlacementScope | undefined

  postOrderApply(vNode, {
    onDescent: (node) => {
      if (!node.child) return
      if (node.dom) {
        // collect host nodes as we go
        currentHostNode = { node: node as ElementVNode }
        hostNodes.push(currentHostNode)

        if (currentPlacementScope?.active) {
          currentPlacementScope.child = node
          // prevent scope applying to descendants of this element node
          currentPlacementScope.active = false
        }
      } else if (bitmapOps.isFlagSet(node, FLAG.PLACEMENT)) {
        currentPlacementScope = { parent: node, active: true }
        placementScopes.push(currentPlacementScope)
      }
    },
    onAscent: (node) => {
      let inheritsPlacement = false
      if (currentPlacementScope?.child === node) {
        currentPlacementScope.active = true
        inheritsPlacement = true
      }
      if (bitmapOps.isFlagSet(node, FLAG.DELETION)) {
        return commitDeletion(node)
      }
      if (node.dom) {
        commitDom(node as DomVNode, currentHostNode, inheritsPlacement)
      }
      commitSnapshot(node)
    },
    onBeforeAscent(node) {
      if (currentPlacementScope?.parent === node) {
        placementScopes.pop()
        currentPlacementScope = placementScopes[placementScopes.length - 1]
      }
      if (currentHostNode?.node === node.parent) {
        hostNodes.pop()
        currentHostNode = hostNodes[hostNodes.length - 1]
      }
    },
  })

  handlePostPlacementFocusPersistence()
}

function commitDom(
  vNode: DomVNode,
  hostNode: HostNode | undefined,
  inheritsPlacement: boolean
) {
  if (isPortal(vNode)) return
  if (
    inheritsPlacement ||
    !vNode.dom.isConnected ||
    bitmapOps.isFlagSet(vNode, FLAG.PLACEMENT)
  ) {
    const parent = hostNode?.node ?? getDomParent(vNode)
    placeDom(vNode, parent, hostNode?.lastChild?.dom)
  }
  if (!vNode.prev || bitmapOps.isFlagSet(vNode, FLAG.UPDATE)) {
    updateDom(vNode)
  }
  if (hostNode) {
    hostNode.lastChild = vNode
  }
}

function commitDeletion(vNode: VNode) {
  if (vNode === vNode.parent?.child) {
    vNode.parent.child = vNode.sibling
  }
  traverseApply(vNode, (n) => {
    while (n.hooks?.length) cleanupHook(n.hooks.pop()!)
    while (n.subs?.length) {
      console.log("unsubbing node", n, [...n.subs])
      Signal.unsubscribe(n, n.subs.pop()!)
    }
    n.cleanups && Object.values(n.cleanups).forEach((c) => c())
    delete n.cleanups

    if (n.dom) {
      if (n.dom.isConnected && !isPortal(n)) n.dom.remove()
      delete n.dom
      setDomRef(n, null)
    }
  })
}
