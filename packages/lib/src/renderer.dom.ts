import type { Renderer } from "./renderer"
import type { MaybeDom, SomeDom, SomeElement } from "./types.utils"
import type { StyleObject } from "./types.dom"
import { ELEMENT_TYPE } from "./constants.js"
import {
  booleanAttributes,
  getCurrentRenderMode,
  propFilters,
  propToHtmlAttr,
  svgTags,
} from "./utils.js"
import { unwrap } from "./signals/utils.js"
import { Signal } from "./signals/base.js"
import { isPortalRoot } from "./portal.js"
import { KaiokenError } from "./error.js"
import { createElement } from "./element"
import { __DEV__ } from "./env.js"

type WrappedFocusEventMap = {
  onfocus?: (event: FocusEvent) => void
  onblur?: (event: FocusEvent) => void
}
type DomRendererNodeTypes = {
  parent: HTMLElement | SVGElement
  child: HTMLElement | SVGElement | Text
}
export default function createRenderer(): Renderer<DomRendererNodeTypes> {
  const hydrationStack = createHydrationStack()
  const vNodeToWrappedFocusEventHandlersMap = new WeakMap<
    Kaioken.VNode,
    WrappedFocusEventMap
  >()

  let persistingFocus = false
  let currentActiveElement: Element | null = null
  let didBlurActiveElement = false
  function placementBlurHandler(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    didBlurActiveElement = true
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
    if (currentActiveElement && currentActiveElement !== document.body) {
      currentActiveElement?.removeEventListener("blur", placementBlurHandler)
      if (currentActiveElement?.isConnected) {
        if (
          "focus" in currentActiveElement &&
          typeof currentActiveElement.focus === "function"
        ) {
          currentActiveElement.focus()
        }
      }
    }
    persistingFocus = false
  }

  function hydrateDom(vNode: Kaioken.VNode) {
    const dom = hydrationStack.nextChild()
    if (!dom)
      throw new KaiokenError({
        message: `Hydration mismatch - no node found`,
        vNode,
      })
    let nodeName = dom.nodeName
    if (svgTags.indexOf(nodeName) === -1) {
      nodeName = nodeName.toLowerCase()
    }
    if ((vNode.type as string) !== nodeName) {
      throw new KaiokenError({
        message: `Hydration mismatch - expected node of type ${vNode.type.toString()} but received ${nodeName}`,
        vNode,
      })
    }
    vNode.dom = dom
    if (vNode.type !== ELEMENT_TYPE.text) {
      updateElement(vNode, vNode.prev?.props ?? {}, vNode.props)
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

  const updateElement: Renderer<DomRendererNodeTypes>["updateElement"] = (
    vNode,
    prevProps,
    nextProps
  ) => {
    const dom = vNode.dom as SomeDom
    if (getCurrentRenderMode() === "hydrate" && vNode.child) {
      hydrationStack.push(dom)
    }
    if (isPortalRoot(dom)) return

    const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

    keys.forEach((key) => {
      if (propFilters.internalProps.includes(key) && key !== "innerHTML") {
        if (key === "ref" && prevProps[key] !== nextProps[key]) {
          if (prevProps[key]) {
            setDomRef(prevProps[key], null)
          }
          if (nextProps[key]) {
            setDomRef(nextProps[key], dom)
          }
        }
        return
      }

      if (key.startsWith("on")) {
        if (
          prevProps[key] !== nextProps[key] ||
          getCurrentRenderMode() === "hydrate"
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
          const unsub = nextProps[key].subscribe((value) => {
            setProp(vNode, dom, key, value, null)
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

  return {
    appendChild(parent, element) {
      parent.appendChild(element)
    },
    prependChild(parent, element) {
      parent.insertBefore(element, parent.firstChild)
    },
    onRemove(vNode) {
      if (vNode.dom) {
        if (vNode.props.ref)
          setDomRef(vNode.props.ref as Kaioken.Ref<SomeDom>, null)

        if (vNode.dom.isConnected && !isPortalRoot(vNode.dom))
          vNode.dom.remove()
        delete vNode.dom
      }
    },
    insertAfter(_, prev, element) {
      prev.after(element)
    },
    shouldSearchChildrenForSibling(vNode) {
      return !isPortalRoot(vNode.dom)
    },
    createRoot(container, children) {
      const root = createElement(container.nodeName.toLowerCase(), {}, children)
      root.dom = container
      if (__DEV__) {
        // @ts-ignore
        root.dom.__kaiokenNode = root
      }
      if (getCurrentRenderMode() === "hydrate") {
        hydrationStack.captureEvents(container)
      }
      return root
    },
    onRootMounted(container) {
      if (getCurrentRenderMode() === "hydrate") {
        hydrationStack.releaseEvents(container)
      }
    },
    createElement(vNode) {
      let dom
      if (getCurrentRenderMode() === "dom") {
        const t = vNode.type as string
        if (t === ELEMENT_TYPE.text) {
          dom = createTextNode(vNode)
        } else if (svgTags.includes(t)) {
          dom = document.createElementNS("http://www.w3.org/2000/svg", t)
        } else {
          dom = document.createElement(t)
        }
      } else {
        hydrateDom(vNode)
        dom = vNode.dom!
      }
      // @ts-ignore
      dom.__kaiokenNode = vNode
      return dom
    },
    getMountableParent(vNode) {
      let parentNode: Kaioken.VNode | undefined =
        vNode.parent ?? vNode.prev?.parent
      let isValidMountPoint = false
      while (parentNode && !isValidMountPoint) {
        parentNode = parentNode.parent
        isValidMountPoint = !!parentNode && !!parentNode.dom
      }

      if (!isValidMountPoint || !parentNode) {
        if (!vNode.parent) {
          // handle app entry
          if (vNode.dom) return vNode
        }

        throw new KaiokenError({
          message: "No DOM parent found while attempting to place node.",
          vNode: vNode,
        })
      }
      return parentNode
    },
    isValidParent(element): element is HTMLElement | SVGElement {
      return (
        //element.isConnected &&
        element instanceof Element || element instanceof SVGElement
      )
    },
    canInsertAfter(element) {
      return element.isConnected
    },
    updateElement,
    validateProps(vNode) {
      if ("children" in vNode.props && vNode.props.innerHTML) {
        throw new KaiokenError({
          message: "Cannot use both children and innerHTML on an element",
          vNode,
        })
      }
    },
    onBeforeCommit: handlePrePlacementFocusPersistence,
    onAfterCommit: handlePostPlacementFocusPersistence,
    onCommitTraversalDescend: (vNode: Kaioken.VNode) => {
      if (vNode.prev && "innerHTML" in vNode.prev.props) {
        /**
         * We need to update innerHTML during descent in cases
         * where we previously set innerHTML on this element but
         * now we provide children. Setting innerHTML _after_
         * appending children will yeet em into the abyss.
         */
        delete vNode.props.innerHTML
        setInnerHTML(vNode.dom as SomeElement, "")
        // remove innerHTML from prev to prevent our ascension pass from doing this again
        delete vNode.prev.props.innerHTML
      }
    },
    onUpdateTraversalAscend: () => hydrationStack.pop(),
  }
}

function setProp(
  vNode: Kaioken.VNode,
  element: SomeElement,
  key: string,
  value: unknown,
  prev: unknown
) {
  if (value === prev) return
  switch (key) {
    case "style":
      return setStyleProp(vNode, element, value, prev)
    case "innerHTML":
      return setInnerHTML(element, value)
    case "muted":
      ;(element as HTMLMediaElement).muted = Boolean(value)
      return
    case "value":
      if (needsExplicitValueSet(element)) {
        element.value =
          value === undefined || value === null ? "" : String(value)
      } else {
        element.setAttribute("value", value === undefined ? "" : String(value))
      }
      return
    case "checked":
      if (element.nodeName === "INPUT") {
        ;(element as HTMLInputElement).checked = Boolean(value)
      } else {
        element.setAttribute("checked", String(value))
      }
      return
    default:
      setDomAttribute(element, propToHtmlAttr(key), value)
      break
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

function setInnerHTML(element: SomeElement, value: unknown) {
  if (value === null || value === undefined || typeof value === "boolean") {
    element.innerHTML = ""
    return
  }
  element.innerHTML = String(value)
}

function setStyleProp(
  vNode: Kaioken.VNode,
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

function createTextNode(vNode: Kaioken.VNode): Text {
  const prop = vNode.props.nodeValue
  const value = unwrap(prop)
  const textNode = document.createTextNode(value)
  if (Signal.isSignal(prop)) {
    subTextNode(vNode, textNode, prop)
  }
  return textNode
}

function subTextNode(
  vNode: Kaioken.VNode,
  textNode: Text,
  signal: Signal<string>
) {
  ;(vNode.cleanups ??= {})["nodeValue"] = signal.subscribe((v) => {
    textNode.nodeValue = v
  })
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

const createHydrationStack = () => ({
  parentStack: [] as Array<SomeDom>,
  childIdxStack: [] as Array<number>,
  eventDeferrals: [] as Array<Function>,
  parent: function () {
    return this.parentStack[this.parentStack.length - 1]
  },
  clear: function () {
    this.parentStack.length = 0
    this.childIdxStack.length = 0
  },
  pop: function () {
    this.parentStack.pop()
    this.childIdxStack.pop()
  },
  push: function (el: SomeDom) {
    this.parentStack.push(el)
    this.childIdxStack.push(0)
  },
  nextChild: function () {
    return this.parentStack[this.parentStack.length - 1].childNodes[
      this.childIdxStack[this.childIdxStack.length - 1]++
    ] as MaybeDom
  },
  bumpChildIndex: function () {
    this.childIdxStack[this.childIdxStack.length - 1]++
  },
  captureEvents: function (element: Element) {
    toggleEvtListeners(element, this.captureEvent.bind(this), true)
  },
  releaseEvents: function (element: Element) {
    toggleEvtListeners(element, this.captureEvent.bind(this), false)
    while (this.eventDeferrals.length) this.eventDeferrals.shift()!()
  },
  captureEvent: function (e: Event) {
    const t = e.target
    if (!e.isTrusted || !t) return
    this.eventDeferrals.push(() => t.dispatchEvent(e))
  },
})

const toggleEvtListeners = (
  element: Element,
  handler: (e: Event) => void,
  value: boolean
) => {
  for (const key in element) {
    if (key.startsWith("on")) {
      const eventType = key.substring(2)
      element[value ? "addEventListener" : "removeEventListener"](
        eventType,
        handler,
        { passive: true }
      )
    }
  }
}
