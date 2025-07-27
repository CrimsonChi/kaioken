import {
  traverseApply,
  commitSnapshot,
  propFilters,
  propToHtmlAttr,
  postOrderApply,
} from "./utils.js"
import { booleanAttributes, FLAG, svgTags } from "./constants.js"
import { Signal, unwrap } from "./signals/index.js"
import { ctx, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { StyleObject } from "./types.dom.js"
import { isPortal } from "./portal.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { flags } from "./flags.js"
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

function setDomRef(ref: Kaioken.Ref<SomeDom | null>, value: SomeDom | null) {
  if (typeof ref === "function") {
    ref(value)
    return
  }
  if (Signal.isSignal(ref)) {
    ref.sneak(value)
    ref.notify({
      filter: (sub) => typeof sub === "function",
    })
    return
  }
  ;(ref as Kaioken.MutableRefObject<SomeDom | null>).current = value
}

function createDom(vNode: DomVNode): SomeDom {
  const t = vNode.type
  const dom =
    t == "#text"
      ? createTextNode(vNode)
      : svgTags.has(t)
      ? document.createElementNS("http://www.w3.org/2000/svg", t)
      : document.createElement(t)

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

function wrapFocusEventHandler(
  vNode: VNode,
  evtName: "focus" | "blur",
  callback: (event: FocusEvent) => void
) {
  const wrappedHandlers = vNodeToWrappedFocusEventHandlersMap.get(vNode) ?? {}
  const handler = (wrappedHandlers[evtName] = (event: FocusEvent) => {
    if (persistingFocus) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    callback(event)
  })
  vNodeToWrappedFocusEventHandlersMap.set(vNode, wrappedHandlers)
  return handler
}

type WrappedFocusEventMap = {
  focus?: (event: FocusEvent) => void
  blur?: (event: FocusEvent) => void
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
  const isHydration = renderMode.current === "hydrate"

  keys.forEach((key) => {
    const prev = prevProps[key],
      next = nextProps[key]
    if (propFilters.internalProps.includes(key) && key !== "innerHTML") {
      if (key === "ref" && prev !== next) {
        if (prev) {
          setDomRef(prev, null)
        }
        if (next) {
          setDomRef(next, dom)
        }
      }
      return
    }

    if (propFilters.isEvent(key)) {
      if (prev !== next || renderMode.current === "hydrate") {
        const evtName = key.toLowerCase().substring(2)
        const isFocusEvent = evtName === "focus" || evtName === "blur"
        if (key in prevProps) {
          dom.removeEventListener(
            evtName,
            isFocusEvent
              ? vNodeToWrappedFocusEventHandlersMap.get(vNode)?.[evtName]
              : prev
          )
        }
        if (key in nextProps) {
          dom.addEventListener(
            evtName,
            isFocusEvent ? wrapFocusEventHandler(vNode, evtName, next) : next
          )
        }
      }
      return
    }

    if (!(dom instanceof Text)) {
      if (prev === next || (isHydration && dom.getAttribute(key) === next)) {
        return
      }

      if (Signal.isSignal(prev) && vNode.cleanups) {
        const v = vNode.cleanups[key]
        v && (v(), delete vNode.cleanups[key])
      }
      if (Signal.isSignal(next)) {
        return setSignalProp(vNode, dom, key, next, prev)
      }
      setProp(dom, key, next, prev)
      return
    }
    if (Signal.isSignal(next)) {
      // signal textNodes are handled via 'subTextNode'.
      return
    }
    // text node
    if (dom.nodeValue !== next) {
      dom.nodeValue = next
    }
  })
}

function deriveSelectElementValue(dom: HTMLSelectElement) {
  if (dom.multiple) {
    return Array.from(dom.selectedOptions).map((option) => option.value)
  }
  return dom.value
}

function setSelectElementValue(dom: HTMLSelectElement, value: any) {
  if (!dom.multiple || value === undefined || value === null || value === "") {
    dom.value = value
    return
  }
  Array.from(dom.options).forEach((option) => {
    option.selected = value.indexOf(option.value) > -1
  })
}

const bindAttrToEventMap: Record<string, string> = {
  value: "input",
  checked: "change",
  open: "toggle",
  volume: "volumechange",
  playbackRate: "ratechange",
  currentTime: "timeupdate",
}
const numericValueElements = ["progress", "meter", "number", "range"]

function setSignalProp(
  vNode: VNode,
  dom: Exclude<SomeDom, Text>,
  key: string,
  signal: Signal<any>,
  prevValue: unknown
) {
  const _ctx = ctx.current
  const cleanups = (vNode.cleanups ??= {})
  const [modifier, attr] = key.split(":")
  if (modifier !== "bind") {
    cleanups[key] = signal.subscribe((value) => {
      setProp(dom, key, value, null)
      if (__DEV__) {
        window.__kaioken?.profilingContext?.emit("signalAttrUpdate", _ctx)
      }
    })

    return setProp(dom, key, signal.peek(), unwrap(prevValue))
  }

  const evtName = bindAttrToEventMap[attr]
  if (!evtName) {
    if (__DEV__) {
      console.error(
        `[kaioken]: ${attr} is not a valid element binding attribute.`
      )
    }
    return
  }

  const isSelect = dom instanceof HTMLSelectElement
  const setAttr = isSelect
    ? (value: any) => setSelectElementValue(dom, value)
    : (value: any) => ((dom as any)[attr] = value)

  const signalUpdateCallback = (value: any) => {
    setAttr(value)
    if (__DEV__) {
      window.__kaioken?.profilingContext?.emit("signalAttrUpdate", _ctx)
    }
  }

  const setSigFromElement = (val: any) => {
    signal.sneak(val)
    signal.notify({ filter: (sub) => sub !== signalUpdateCallback })
  }

  let evtHandler: (evt: Event) => void
  if (attr === "value") {
    const useNumericValue =
      numericValueElements.indexOf((dom as HTMLInputElement).type) !== -1
    evtHandler = () => {
      let val: any = (dom as HTMLInputElement | HTMLSelectElement).value
      if (isSelect) {
        val = deriveSelectElementValue(dom)
      } else if (typeof signal.peek() === "number" && useNumericValue) {
        val = (dom as HTMLInputElement).valueAsNumber
      }
      setSigFromElement(val)
    }
  } else {
    evtHandler = (e: Event) => {
      const val = (e.target as any)[attr]
      /**
       * the 'timeupdate' event is fired when the currentTime property is
       * set (from code OR playback), so we need to prevent unnecessary
       * signal updates to avoid a feedback loop when there are multiple
       * elements with the same signal bound to 'currentTime'
       */
      if (attr === "currentTime" && signal.peek() === val) return
      setSigFromElement(val)
    }
  }

  dom.addEventListener(evtName, evtHandler)
  const unsub = signal.subscribe(signalUpdateCallback)

  cleanups[key] = () => {
    dom.removeEventListener(evtName, evtHandler)
    unsub()
  }

  return setProp(dom, attr, signal.peek(), unwrap(prevValue))
}

function subTextNode(vNode: VNode, textNode: Text, signal: Signal<string>) {
  const _ctx = ctx.current
  ;(vNode.cleanups ??= {}).nodeValue = signal.subscribe((v) => {
    textNode.nodeValue = v
    if (__DEV__) {
      window.__kaioken?.profilingContext?.emit("signalTextUpdate", _ctx)
    }
  })
}

function hydrateDom(vNode: VNode) {
  const dom = hydrationStack.nextChild()
  if (!dom)
    throw new KaiokenError({
      message: `Hydration mismatch - no node found`,
      vNode,
    })
  let nodeName = dom.nodeName
  if (!svgTags.has(nodeName)) {
    nodeName = nodeName.toLowerCase()
  }
  if ((vNode.type as string) !== nodeName) {
    throw new KaiokenError({
      message: `Hydration mismatch - expected node of type ${vNode.type.toString()} but received ${nodeName}`,
      vNode,
    })
  }
  vNode.dom = dom
  if (vNode.type !== "#text") {
    updateDom(vNode)
    return
  }
  if (Signal.isSignal(vNode.props.nodeValue)) {
    subTextNode(vNode, dom as Text, vNode.props.nodeValue)
  }

  let prev = vNode
  let sibling = vNode.sibling
  while (sibling && sibling.type === "#text") {
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

function setDomAttribute(element: Element, key: string, value: unknown) {
  const isBoolAttr = booleanAttributes.has(key)

  if (handleAttributeRemoval(element, key, value, isBoolAttr)) return

  element.setAttribute(
    key,
    isBoolAttr && typeof value === "boolean" ? "" : String(value)
  )
}

const explicitValueElementTags = ["INPUT", "TEXTAREA"]

const needsExplicitValueSet = (
  element: SomeElement
): element is HTMLInputElement | HTMLTextAreaElement => {
  return explicitValueElementTags.indexOf(element.nodeName) > -1
}

function setProp(
  element: SomeElement,
  key: string,
  value: unknown,
  prev: unknown
) {
  if (value === prev) return
  switch (key) {
    case "style":
      return setStyleProp(element, value, prev)
    case "className":
      return setClassName(element, value)
    case "innerHTML":
      return setInnerHTML(element, value)
    case "muted":
      ;(element as HTMLMediaElement).muted = Boolean(value)
      return
    case "value":
      if (element.nodeName === "SELECT") {
        return setSelectElementValue(element as HTMLSelectElement, value)
      }
      const strVal = value === undefined || value === null ? "" : String(value)
      if (needsExplicitValueSet(element)) {
        element.value = strVal
        return
      }
      element.setAttribute("value", strVal)
      return
    case "checked":
      if (element.nodeName === "INPUT") {
        ;(element as HTMLInputElement).checked = Boolean(value)
        return
      }
      element.setAttribute("checked", String(value))
      return
    default:
      return setDomAttribute(element, propToHtmlAttr(key), value)
  }
}

function setInnerHTML(element: SomeElement, value: unknown) {
  if (value === null || value === undefined || typeof value === "boolean") {
    element.innerHTML = ""
    return
  }
  element.innerHTML = String(value)
}

function setClassName(element: SomeElement, value: unknown) {
  const val = unwrap(value)
  if (!val) {
    return element.removeAttribute("class")
  }
  element.setAttribute("class", val as string)
}

function setStyleProp(element: SomeElement, value: unknown, prev: unknown) {
  if (handleAttributeRemoval(element, "style", value)) return

  if (typeof value === "string") {
    element.setAttribute("style", value)
    return
  }

  let prevStyle: StyleObject = {}
  if (typeof prev === "string") {
    element.setAttribute("style", "")
  } else if (typeof prev === "object" && !!prev) {
    prevStyle = prev as StyleObject
  }

  const nextStyle = value as StyleObject
  const keys = new Set([
    ...Object.keys(prevStyle),
    ...Object.keys(nextStyle),
  ]) as Set<keyof StyleObject>

  keys.forEach((k) => {
    const prev = prevStyle[k]
    const next = nextStyle[k]
    if (prev === next) return

    if (next === undefined) {
      element.style[k as any] = ""
      return
    }

    element.style[k as any] = next as any
  })
}

function getDomParent(vNode: VNode): ElementVNode {
  let parentNode: VNode | null = vNode.parent
  let parentNodeElement = parentNode?.dom
  while (parentNode && !parentNodeElement) {
    parentNode = parentNode.parent
    parentNodeElement = parentNode?.dom
  }

  if (!parentNodeElement || !parentNode) {
    // handle app entry
    if (!vNode.parent && vNode.dom) {
      return vNode as ElementVNode
    }

    throw new KaiokenError({
      message: "No DOM parent found while attempting to place node.",
      vNode: vNode,
    })
  }
  return parentNode as ElementVNode
}

function placeDom(vNode: DomVNode, hostNode: HostNode) {
  const { node: parentVNodeWithDom, lastChild } = hostNode
  const dom = vNode.dom
  if (lastChild) {
    lastChild.dom.after(dom)
    return
  }
  // TODO: we can probably skip the 'next sibling search' if we're appending
  const nextSiblingDom = getNextSiblingDom(vNode, parentVNodeWithDom)
  if (nextSiblingDom) {
    parentVNodeWithDom.dom.insertBefore(dom, nextSiblingDom)
    return
  }

  parentVNodeWithDom.dom.appendChild(dom)
}

function getNextSiblingDom(vNode: VNode, parent: ElementVNode): MaybeDom {
  let node: VNode | null = vNode

  while (node) {
    let sibling = node.sibling

    while (sibling) {
      // Skip unmounted, to-be-placed & portal nodes
      if (!flags.get(sibling.flags, FLAG.PLACEMENT) && !isPortal(sibling)) {
        // Descend into the child to find host dom
        const dom = findFirstHostDom(sibling)
        if (dom?.isConnected) return dom
      }
      sibling = sibling.sibling
    }

    // Move up to parent — but don't escape portal boundary
    node = node.parent
    if (!node || isPortal(node) || node === parent) {
      return
    }
  }

  return
}

function findFirstHostDom(vNode: VNode): MaybeDom {
  let node: VNode | null = vNode

  while (node) {
    if (node.dom) return node.dom
    if (isPortal(node)) return // Don't descend into portals
    node = node.child
  }
  return
}

function commitWork(vNode: VNode) {
  if (renderMode.current === "hydrate") {
    return traverseApply(vNode, commitSnapshot)
  }
  if (flags.get(vNode.flags, FLAG.DELETION)) {
    return commitDeletion(vNode)
  }
  handlePrePlacementFocusPersistence()

  const hostNodes: HostNode[] = []
  let currentHostNode: HostNode
  const placementScopes: PlacementScope[] = []
  let currentPlacementScope: PlacementScope | undefined

  postOrderApply(vNode, {
    onDescent: (node) => {
      if (node.dom) {
        // collect host nodes as we go
        currentHostNode = { node: node as ElementVNode }
        hostNodes.push(currentHostNode)

        if (node.prev && "innerHTML" in node.prev.props) {
          /**
           * We need to update innerHTML during descent in cases
           * where we previously set innerHTML on this element but
           * now we provide children. Setting innerHTML _after_
           * appending children will yeet em into the abyss.
           */
          delete node.props.innerHTML
          setInnerHTML(node.dom as SomeElement, "")
          // remove innerHTML from prev to prevent our ascension pass from doing this again
          delete node.prev.props.innerHTML
        }

        if (currentPlacementScope?.active) {
          currentPlacementScope.child = node
          // prevent scope applying to descendants of this element node
          currentPlacementScope.active = false
        }
      } else if (flags.get(node.flags, FLAG.PLACEMENT)) {
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
      if (flags.get(node.flags, FLAG.DELETION)) {
        return commitDeletion(node)
      }
      if (node.dom) {
        if (!currentHostNode) {
          currentHostNode = { node: getDomParent(node) }
          hostNodes.push(currentHostNode)
        }
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
  hostNode: HostNode,
  inheritsPlacement: boolean
) {
  if (isPortal(vNode)) return
  if (
    inheritsPlacement ||
    !vNode.dom.isConnected ||
    flags.get(vNode.flags, FLAG.PLACEMENT)
  ) {
    placeDom(vNode, hostNode)
  }
  if (!vNode.prev || flags.get(vNode.flags, FLAG.UPDATE)) {
    updateDom(vNode)
  }
  hostNode.lastChild = vNode
}

function commitDeletion(vNode: VNode) {
  if (vNode === vNode.parent?.child) {
    vNode.parent.child = vNode.sibling
  }
  traverseApply(vNode, (node) => {
    const {
      hooks,
      subs,
      cleanups,
      dom,
      props: { ref },
    } = node
    while (hooks?.length) hooks.pop()!.cleanup?.()
    subs?.forEach((sub) => Signal.unsubscribe(node, sub))
    if (cleanups) Object.values(cleanups).forEach((c) => c())

    if (__DEV__) {
      window.__kaioken?.profilingContext?.emit("removeNode", ctx.current)
    }

    if (dom) {
      if (ref) setDomRef(ref as Kaioken.Ref<SomeDom>, null)
      if (dom.isConnected && !isPortal(node)) {
        dom.remove()
      }
      delete node.dom
    }
  })
}
