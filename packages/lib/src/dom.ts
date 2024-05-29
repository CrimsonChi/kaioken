import type { AppContext } from "./appContext"
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

export { commitWork, createDom }

type VNode = Kaioken.VNode

function createDom(vNode: VNode): HTMLElement | SVGElement | Text {
  const t = vNode.type as string
  let dom =
    t == elementTypes.text
      ? document.createTextNode(vNode.props?.nodeValue ?? "")
      : svgTags.includes(t)
        ? document.createElementNS("http://www.w3.org/2000/svg", t)
        : document.createElement(t)

  vNode.dom = updateDom(vNode, dom)
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
  if (key === "style") return setStyleProp(dom, value, prev)
  setDomAttribute(dom, propToHtmlAttr(key), value)
}

function setInnerHTML(
  dom: HTMLElement | SVGElement,
  value: unknown,
  prev: unknown
) {
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
  dom: HTMLElement | SVGElement,
  value: unknown,
  prev: unknown
) {
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

function updateDom(node: VNode, dom: HTMLElement | SVGElement | Text) {
  if (node.instance?.doNotModifyDom) return node.dom
  const prevProps: Record<string, any> = node.prev?.props ?? {}
  const nextProps: Record<string, any> = node.props ?? {}

  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])

  keys.forEach((key) => {
    if (key === "innerHTML") {
      return setInnerHTML(dom as any, nextProps[key], prevProps[key])
    }

    if (propFilters.internalProps.includes(key)) return

    if (propFilters.isEvent(key) && prevProps[key] !== nextProps[key]) {
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

  return dom
}
type DomParentSearchResult = {
  node: VNode
  element: HTMLElement | SVGElement | Text
}
function getDomParent(node: VNode): DomParentSearchResult {
  let domParentNode: VNode | undefined = node.parent ?? node.prev?.parent
  let domParent = domParentNode?.dom
  while (domParentNode && !domParent) {
    domParentNode = domParentNode.parent
    domParent = domParentNode?.dom
  }

  if (!domParent || !domParentNode) {
    if (!node.parent) {
      // handle app entry
      if (node.dom) return { node, element: node.dom }
    }

    throw new Error(
      "[kaioken]: no domParent found - seek help!\n" + String(node)
    )
  }
  return { node: domParentNode, element: domParent }
}

function placeDom(
  vNode: VNode,
  dom: HTMLElement | SVGElement | Text,
  prevSiblingDom: HTMLElement | SVGElement | Text | undefined,
  mntParent: DomParentSearchResult
) {
  if (prevSiblingDom) {
    prevSiblingDom.after(dom)
    return
  }
  const { element, node } = mntParent
  if (element.childNodes.length === 0) {
    element.appendChild(dom)
  } else {
    // the following is likely a somewhat naiive implementation of the algorithm
    // but it should be good enough for most cases. Will be improved as/when
    // edge cases are encountered.

    // first, try to find next dom by traversing through siblings
    let nextDom = findMountedDomRecursive(vNode.sibling)
    if (nextDom === undefined) {
      // try to find next dom by traversing (up and across) through the tree
      // handles cases like the following:
      /**
       * <div>
       *    <>
       *      <TheComponentThatIsUpdating />
       *    <>
       *    <>
       *      <div></div> <- find this node
       *    </>
       * </div>
       */
      let parent = vNode.parent

      while (!nextDom && parent && parent !== node) {
        nextDom = findMountedDomRecursive(parent.sibling)
        parent = parent.parent
      }
    }

    if (nextDom) {
      nextDom.before(dom)
    } else {
      element.appendChild(dom)
    }
  }
}

function commitWork(ctx: AppContext, vNode: VNode) {
  let commitSibling = false
  type MaybeDom = HTMLElement | SVGElement | Text | undefined
  type StackItem = [VNode, MaybeDom, DomParentSearchResult | undefined]

  const stack: StackItem[] = [[vNode, undefined, undefined]]

  while (stack.length) {
    let [n, prevSiblingDom, mntParent] = stack.pop()!
    const dom = n.dom

    if (dom) {
      if (!dom.isConnected || n.effectTag === EffectTag.PLACEMENT) {
        if (!mntParent) {
          mntParent = getDomParent(n)
        }
        placeDom(n, dom, prevSiblingDom, mntParent)
      } else if (n.effectTag === EffectTag.UPDATE) {
        updateDom(n, dom)
      }

      if (n.props.ref) {
        n.props.ref.current = dom
      }
    }

    if (commitSibling && n.sibling) {
      stack.push([n.sibling, dom, mntParent])
    }
    commitSibling = true

    if (n.effectTag === EffectTag.DELETION) {
      commitDeletion(n)
      continue
    }

    if (n.child) {
      stack.push([
        n.child,
        undefined,
        dom ? { element: dom, node: n } : undefined,
      ])
    }

    const instance = n.instance
    if (instance) {
      const onMounted = instance.componentDidMount?.bind(instance)
      if (!n.prev && onMounted) {
        ctx.queueEffect(onMounted)
      } else if (n.effectTag === EffectTag.UPDATE) {
        const onUpdated = instance.componentDidUpdate?.bind(instance)
        if (onUpdated) ctx.queueEffect(onUpdated)
      }
      ctx.scheduler.queueCurrentNodeEffects()
    }

    n.effectTag = undefined
    n.prev = { ...n, prev: undefined }
  }
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

function findMountedDomRecursive(
  vNode?: VNode
): HTMLElement | SVGElement | Text | undefined {
  if (!vNode) return
  const stack: VNode[] = [vNode]
  while (stack.length) {
    const n = stack.pop()!
    if (n.dom?.isConnected) return n.dom
    if (n.sibling) stack.push(n.sibling)
    if (n.child) stack.push(n.child)
  }
  return void 0
}
