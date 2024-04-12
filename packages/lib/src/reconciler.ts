import { EffectTag, elementTypes, elementFreezeSymbol } from "./constants.js"
import type { AppContext } from "./appContext"
import { ctx, nodeToCtxMap } from "./globals.js"
import { isVNode, isValidChild } from "./utils.js"

type VNode = Kaioken.VNode

export function reconcileChildren(
  appCtx: AppContext,
  vNode: VNode,
  children: VNode[]
) {
  let index = 0
  let prevOldNode: VNode | undefined = undefined
  let oldNode: VNode | undefined = vNode.prev && vNode.prev.child
  let prevNewNode: VNode | undefined = undefined
  let newNode: VNode | undefined = undefined
  let resultingChild: VNode | undefined = undefined
  let lastPlacedIndex = 0

  for (; !!oldNode && index < children.length; index++) {
    newNode = updateSlot(appCtx, vNode, children[index], oldNode, index)
    if (!newNode) break
    lastPlacedIndex = placeChild(newNode, lastPlacedIndex, index)

    if (oldNode) {
      prevOldNode = oldNode
      oldNode = oldNode.sibling
    }
    if (prevNewNode) {
      prevNewNode.sibling = newNode
    }
    prevNewNode = newNode
    if (index === 0) {
      resultingChild = newNode
    }
  }

  // matched all children?
  if (index === children.length) {
    while (oldNode) {
      if (prevOldNode) {
        prevOldNode.sibling = undefined
      }
      prevOldNode = oldNode
      appCtx.requestDelete(oldNode)
      oldNode = oldNode.sibling
    }
    return resultingChild
  }

  // just some good ol' insertions, baby
  if (!oldNode) {
    for (; index < children.length; index++) {
      const child = children[index]
      if (!isValidChild(child)) continue
      newNode = createChild(vNode, child, index)
      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, index)
      if (index === 0) {
        resultingChild = newNode
      } else if (prevNewNode) {
        prevNewNode.sibling = newNode
      }
      prevNewNode = newNode
    }
    return resultingChild
  }

  // deal with mismatched keys / unmatched children
  const existingChildren = mapRemainingChildren(oldNode)

  for (; index < children.length; index++) {
    const child = children[index]
    const newNode = updateFromMap(existingChildren, vNode, index, child)
    if (newNode !== undefined) {
      if (newNode.prev !== undefined) {
        // node persisted, remove it from the list so it doesn't get deleted
        existingChildren.delete(
          newNode.prev.props.key === undefined
            ? newNode.prev.index
            : newNode.prev.props.key
        )
      }
      copyNodeMemoization(child, newNode)
      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, index)
      nodeToCtxMap.set(newNode, ctx.current)

      if (index === 0) {
        resultingChild = newNode
      } else if (prevNewNode) {
        prevNewNode.sibling = newNode
      }
      prevNewNode = newNode
      if (index === children.length - 1) {
        newNode.sibling = undefined
      }
    }
  }

  existingChildren.forEach((child) => appCtx.requestDelete(child))
  return resultingChild
}

function createChild(parent: VNode, child: any, index: number): VNode {
  let newNode: VNode
  if (isVNode(child)) {
    newNode = {
      type: child.type,
      props: child.props,
      parent,
      effectTag: EffectTag.PLACEMENT,
      index,
    }
  } else {
    newNode = {
      type: elementTypes.text,
      props: {
        nodeValue: String(child),
        children: [],
      },
      parent,
      effectTag: EffectTag.PLACEMENT,
      index,
    }
  }

  copyNodeMemoization(child, newNode)
  nodeToCtxMap.set(newNode, ctx.current)

  return newNode
}

function updateSlot(
  appCtx: AppContext,
  parent: VNode,
  child: VNode,
  oldNode: VNode | undefined,
  index: number
) {
  let newNode: VNode | undefined
  const sameType = oldNode && child && child.type == oldNode.type
  if (oldNode && child && child.type == oldNode.type) {
    if (oldNode.props.key !== child.props.key) return undefined
    newNode = oldNode
    newNode.props = child.props
    newNode.parent = parent
    newNode.effectTag = EffectTag.UPDATE
    copyNodeMemoization(child, newNode)
    nodeToCtxMap.set(newNode, ctx.current)
  } else if (isValidChild(child) && !sameType) {
    newNode = createChild(parent, child, index)
  }
  if (oldNode && !sameType) {
    appCtx.requestDelete(oldNode)
  }
  return newNode
}

function copyNodeMemoization(child: VNode, vNode: VNode) {
  if (elementFreezeSymbol in child) {
    Object.assign(vNode, {
      [elementFreezeSymbol]: child[elementFreezeSymbol],
    })
  }
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
): VNode | undefined {
  if (
    (typeof newChild === "string" && newChild !== "") ||
    typeof newChild === "number"
  ) {
    const oldChild = existingChildren.get(index)
    if (oldChild) {
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

  return
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
