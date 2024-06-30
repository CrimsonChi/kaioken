import { EffectTag, elementTypes } from "./constants.js"
import { ctx, nodeToCtxMap } from "./globals.js"
import { isVNode } from "./utils.js"
import { createElement } from "./index.js"

type VNode = Kaioken.VNode

export function reconcileChildren(
  vNode: VNode,
  currentFirstChild: VNode | null,
  children: unknown[]
) {
  // if (vNode.type instanceof Function && "test" in vNode.type) {
  //   debugger
  // }
  let resultingChild: VNode | null = null
  let prevNewNode: VNode | null = null

  let oldNode = currentFirstChild
  let lastPlacedIndex = 0
  let newIdx = 0
  let nextOldNode = null

  for (; !!oldNode && newIdx < children.length; newIdx++) {
    if (oldNode.index > newIdx) {
      nextOldNode = oldNode
      oldNode = null
    } else {
      nextOldNode = oldNode.sibling || null
    }
    const newNode = updateSlot(vNode, oldNode, children[newIdx])
    if (newNode === null) {
      if (oldNode === null) {
        oldNode = nextOldNode
      }
      break
    }
    if (oldNode && !newNode.prev) {
      ctx.current.requestDelete(oldNode)
    }
    lastPlacedIndex = placeChild(newNode, lastPlacedIndex, newIdx)
    if (prevNewNode === null) {
      resultingChild = newNode
    } else {
      prevNewNode.sibling = newNode
    }
    prevNewNode = newNode
    oldNode = nextOldNode
  }

  // matched all children?
  if (newIdx === children.length) {
    while (oldNode !== null) {
      ctx.current.requestDelete(oldNode)
      oldNode = oldNode.sibling || null
    }
    return resultingChild
  }

  // just some good ol' insertions, baby
  if (oldNode === null) {
    for (; newIdx < children.length; newIdx++) {
      const newNode = createChild(vNode, children[newIdx])
      if (newNode === null) continue

      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, newIdx)
      if (prevNewNode === null) {
        resultingChild = newNode
      } else {
        prevNewNode.sibling = newNode
      }
      prevNewNode = newNode
    }
    return resultingChild
  }

  // deal with mismatched keys / unmatched children
  const existingChildren = mapRemainingChildren(oldNode)

  for (; newIdx < children.length; newIdx++) {
    const newNode = updateFromMap(
      existingChildren,
      vNode,
      newIdx,
      children[newIdx]
    )
    if (newNode !== null) {
      if (newNode.prev !== undefined) {
        // node persisted, remove it from the list so it doesn't get deleted
        existingChildren.delete(
          newNode.prev.props.key === undefined
            ? newNode.prev.index
            : newNode.prev.props.key
        )
      }
      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, newIdx)
      if (prevNewNode === null) {
        resultingChild = newNode
      } else {
        prevNewNode.sibling = newNode
      }
      prevNewNode = newNode
    }
  }

  existingChildren.forEach((child) => ctx.current.requestDelete(child))
  return resultingChild
}

function updateSlot(parent: VNode, oldNode: VNode | null, child: unknown) {
  // Update the node if the keys match, otherwise return undefined.
  const key = oldNode !== null ? oldNode.props.key : undefined
  if (
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    if (key !== undefined) return null
    return updateTextNode(parent, oldNode, "" + child)
  }
  if (isVNode(child)) {
    if (child.props.key !== key) return null
    return updateNode(parent, oldNode, child)
  }
  if (Array.isArray(child)) {
    if (key !== undefined) return null
    return updateFragment(parent, oldNode, child)
  }
  return null
}

function updateTextNode(parent: VNode, oldNode: VNode | null, content: string) {
  if (oldNode === null || oldNode.type !== elementTypes.text) {
    const newNode = createElement(elementTypes.text, { nodeValue: content })
    newNode.parent = parent
    return newNode
  } else {
    const newNode = oldNode
    newNode.prev = { ...oldNode, props: { ...oldNode.props }, prev: undefined }
    newNode.props.nodeValue = content
    newNode.effectTag = EffectTag.UPDATE
    newNode.sibling = undefined
    return oldNode
  }
}

function updateNode(parent: VNode, oldNode: VNode | null, newNode: VNode) {
  const nodeType = newNode.type
  if (nodeType === elementTypes.fragment) {
    return updateFragment(
      parent,
      oldNode,
      newNode.props.children || [],
      newNode.props
    )
  }
  if (oldNode?.type === nodeType) {
    oldNode.prev = { ...oldNode, props: { ...oldNode.props }, prev: undefined }
    oldNode.index = 0
    oldNode.props = newNode.props
    oldNode.parent = parent
    oldNode.sibling = undefined
    oldNode.effectTag = EffectTag.UPDATE
    oldNode.frozen = newNode.frozen
    return oldNode
  }
  const created = createElement(nodeType, newNode.props)
  created.parent = parent
  return created
}

function updateFragment(
  parent: VNode,
  oldNode: VNode | null,
  children: unknown[],
  newProps = {}
) {
  if (oldNode === null || oldNode.type !== elementTypes.fragment) {
    const el = createElement(elementTypes.fragment, { children })
    el.parent = parent
    return el
  }
  oldNode.prev = { ...oldNode, props: { ...oldNode.props }, prev: undefined }
  oldNode.props = { ...newProps, children }
  oldNode.parent = parent
  oldNode.effectTag = EffectTag.UPDATE
  oldNode.sibling = undefined
  return oldNode
}

function createChild(parent: VNode, child: unknown): VNode | null {
  if (
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    const el = createElement(elementTypes.text, { nodeValue: "" + child })
    el.parent = parent
    return el
  }

  if (typeof child === "object" && child !== null) {
    if (isVNode(child)) {
      const newNode: VNode = {
        type: child.type,
        props: child.props,
        parent,
        effectTag: EffectTag.PLACEMENT,
        index: 0,
      }
      nodeToCtxMap.set(newNode, ctx.current)
      return newNode
    } else if (Array.isArray(child)) {
      const el = createElement(elementTypes.fragment, { children: child })
      el.parent = parent
      return el
    }
  }
  return null
}

function placeChild(
  vNode: VNode | undefined,
  lastPlacedIndex: number,
  newIndex: number
): number {
  if (vNode === undefined) return lastPlacedIndex
  vNode.index = newIndex
  if (vNode.prev !== undefined) {
    const oldIndex = vNode.prev.index
    if (oldIndex < lastPlacedIndex) {
      vNode.effectTag = EffectTag.PLACEMENT
      return lastPlacedIndex
    } else {
      return oldIndex
    }
  } else {
    vNode.effectTag = EffectTag.PLACEMENT
    return lastPlacedIndex
  }
}

function updateFromMap(
  existingChildren: Map<JSX.ElementKey, VNode>,
  parent: VNode,
  index: number,
  newChild: any
): VNode | null {
  if (
    (typeof newChild === "string" && newChild !== "") ||
    typeof newChild === "number" ||
    typeof newChild === "bigint"
  ) {
    const oldChild = existingChildren.get(index)
    if (oldChild) {
      oldChild.prev = {
        ...oldChild,
        props: { ...oldChild.props },
        prev: undefined,
      }
      oldChild.effectTag = EffectTag.UPDATE
      oldChild.props.nodeValue = newChild
      return oldChild
    } else {
      return {
        type: elementTypes.text,
        props: {
          nodeValue: newChild,
          children: [],
        },
        parent,
        effectTag: EffectTag.PLACEMENT,
        index,
      }
    }
  }

  if (isVNode(newChild)) {
    const oldChild = existingChildren.get(
      newChild.props.key === undefined ? index : newChild.props.key
    )
    if (oldChild) {
      oldChild.effectTag = EffectTag.UPDATE
      oldChild.props = newChild.props
      oldChild.frozen = newChild.frozen
      oldChild.sibling = undefined
      return oldChild
    } else {
      return {
        type: newChild.type,
        props: newChild.props,
        parent,
        effectTag: EffectTag.PLACEMENT,
        index,
      }
    }
  }

  return null
}

function mapRemainingChildren(vNode: VNode) {
  const map: Map<JSX.ElementKey, VNode> = new Map()
  let n: VNode | undefined = vNode
  while (n) {
    map.set(n.props.key === undefined ? n.index : n.props.key, n)
    n = n.sibling
  }
  return map
}
