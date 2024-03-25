import type { GlobalContext, KaiokenCtxFollowupFunc } from "./globalContext"
import {
  booleanAttributes,
  propFilters,
  propToHtmlAttr,
  svgTags,
} from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { EffectTag, elementTypes } from "./constants.js"
import { Component } from "./component.js"

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
      if (key in prevProps) dom.removeEventListener(eventType, prevProps[key])
      if (key in nextProps) dom.addEventListener(eventType, nextProps[key])
      return
    }

    if (!(dom instanceof Text)) {
      setProp(dom, key, nextProps[key], prevProps[key])
      return
    }
    if (node.prev?.props && prevProps.nodeValue !== nextProps.nodeValue) {
      dom.nodeValue = nextProps.nodeValue
    }
  })

  return dom
}

function commitWork(
  ctx: GlobalContext,
  vNode: VNode,
  domParent?: HTMLElement | SVGElement | Text,
  prevSiblingDom?: HTMLElement | SVGElement | Text,
  commitSibling = false
): KaiokenCtxFollowupFunc[] {
  const dom = vNode.dom ?? vNode.instance?.rootDom
  if (
    dom &&
    (!dom.isConnected ||
      (vNode.effectTag === EffectTag.PLACEMENT && !vNode.instance?.rootDom))
  ) {
    if (prevSiblingDom?.isConnected) {
      prevSiblingDom.after(dom)
    } else {
      // find mountable parent dom
      let domParentNode: VNode | undefined = vNode.parent ?? vNode.prev?.parent
      if (!domParent) {
        domParent = domParentNode?.instance?.rootDom ?? domParentNode?.dom
        while (domParentNode && !domParent) {
          domParentNode = domParentNode.parent
          domParent = domParentNode?.instance?.rootDom ?? domParentNode?.dom
        }
      }

      if (!domParent || !domParentNode) {
        console.error("[kaioken]: no domParent found - seek help!", vNode)
        return []
      }

      if (domParent.childNodes.length === 0) {
        domParent.appendChild(dom)
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

          while (!nextDom && parent && parent !== domParentNode) {
            nextDom = findMountedDomRecursive(parent.sibling)
            parent = parent.parent
          }
        }

        if (nextDom) {
          nextDom.before(dom)
        } else {
          domParent.appendChild(dom)
        }
      }
    }
  } else if (
    vNode.effectTag === EffectTag.UPDATE &&
    dom &&
    !vNode.instance?.rootDom
  ) {
    updateDom(vNode, dom)
  } else if (vNode.effectTag === EffectTag.DELETION) {
    return commitDeletion(vNode, dom)
  }

  const followUpWork: KaiokenCtxFollowupFunc[] = []
  const { child, sibling } = vNode
  child &&
    followUpWork.push((ctx: GlobalContext) =>
      commitWork(ctx, child, dom, undefined, true)
    )
  commitSibling &&
    sibling &&
    followUpWork.push((ctx: GlobalContext) =>
      commitWork(ctx, sibling, domParent, dom, true)
    )

  const instance = vNode.instance
  if (instance) {
    const onMounted = instance.componentDidMount?.bind(instance)
    if (!vNode.prev && onMounted) {
      ctx.queueEffect(onMounted)
    } else if (vNode.effectTag === EffectTag.UPDATE) {
      const onUpdated = instance.componentDidUpdate?.bind(instance)
      if (onUpdated) ctx.queueEffect(onUpdated)
    }
    ctx.scheduler.queueCurrentNodeEffects()
  }

  if (vNode.props.ref && dom) {
    vNode.props.ref.current = dom
  }
  vNode.effectTag = undefined
  vNode.prev = { ...vNode, prev: undefined }
  return followUpWork
}

function commitDeletion(
  vNode: VNode,
  dom = vNode.dom,
  deleteSibling = false
): KaiokenCtxFollowupFunc[] {
  if (Component.isCtor(vNode.type) && vNode.instance) {
    vNode.instance.componentWillUnmount?.()
  } else if (vNode.type instanceof Function) {
    while (vNode.hooks?.length) cleanupHook(vNode.hooks.pop()!)
  }

  if (dom) {
    if (dom.isConnected && vNode.instance?.rootDom !== dom) dom.remove()
    delete vNode.dom
  }
  const followUps: KaiokenCtxFollowupFunc[] = []
  const { child, sibling } = vNode
  child && followUps.push(() => commitDeletion(child, undefined, true))
  deleteSibling &&
    sibling &&
    followUps.push(() => commitDeletion(sibling, undefined, true))

  return followUps
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
