import type { AppContext } from "./appContext"
import { EFFECT_TAG, ELEMENT_TYPE } from "./constants.js"
import { ctx } from "./globals.js"
import { isVNode } from "./utils.js"
import { Signal } from "./signal.js"
import { __DEV__ } from "./env.js"
import { createElement } from "./element.js"

type VNode = Kaioken.VNode

export function reconcileChildren(
  appCtx: AppContext,
  vNode: VNode,
  currentFirstChild: VNode | null,
  children: unknown
) {
  if (Array.isArray(children)) {
    return reconcileChildrenArray(appCtx, vNode, currentFirstChild, children)
  }
  return reconcileSingleChild(appCtx, vNode, currentFirstChild, children)
}

function reconcileSingleChild(
  appCtx: AppContext,
  vNode: VNode,
  oldChild: VNode | null,
  child: unknown
) {
  if (oldChild === null) {
    return createChild(vNode, child)
  }
  const oldSibling = oldChild.sibling
  const newNode = updateSlot(vNode, oldChild, child)
  if (newNode !== null) {
    if (oldChild && oldChild !== newNode && !newNode.prev) {
      deleteRemainingChildren(appCtx, oldChild)
    } else if (oldSibling) {
      deleteRemainingChildren(appCtx, oldSibling)
    }
    return newNode
  }
  {
    // handle keyed children array -> keyed child
    const existingChildren = mapRemainingChildren(oldChild)
    const newNode = updateFromMap(existingChildren, vNode, 0, child)
    if (newNode !== null) {
      if (newNode.prev !== undefined) {
        // node persisted, remove it from the list so it doesn't get deleted
        existingChildren.delete(
          newNode.prev.props.key === undefined
            ? newNode.prev.index
            : newNode.prev.props.key
        )
      }
      placeChild(newNode, 0, 0)
    }
    existingChildren.forEach((child) => appCtx.requestDelete(child))
    return newNode
  }
}

function reconcileChildrenArray(
  appCtx: AppContext,
  vNode: VNode,
  currentFirstChild: VNode | null,
  children: unknown[]
) {
  let knownKeys: Set<string> | null = null
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
    if (__DEV__) {
      knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
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
      if (__DEV__) {
        knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
      }
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
      if (__DEV__) {
        knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
      }
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

  existingChildren.forEach((child) => appCtx.requestDelete(child))
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
    return updateFragment(parent, oldNode, child /*, { array: true }*/)
  }
  if (Signal.isSignal(child)) {
    return updateSlot(parent, oldNode, child.value)
  }
  return null
}

function updateTextNode(parent: VNode, oldNode: VNode | null, content: string) {
  if (oldNode === null || oldNode.type !== ELEMENT_TYPE.text) {
    const newNode = createElement(ELEMENT_TYPE.text, { nodeValue: content })
    newNode.parent = parent
    return newNode
  } else {
    const newNode = oldNode
    newNode.props.nodeValue = content
    newNode.effectTag = EFFECT_TAG.UPDATE
    newNode.sibling = undefined
    return oldNode
  }
}

function updateNode(parent: VNode, oldNode: VNode | null, newNode: VNode) {
  const nodeType = newNode.type
  if (nodeType === ELEMENT_TYPE.fragment) {
    return updateFragment(
      parent,
      oldNode,
      (newNode.props.children as VNode[]) || [],
      newNode.props
    )
  }
  if (oldNode?.type === nodeType) {
    oldNode.index = 0
    oldNode.props = newNode.props
    oldNode.sibling = undefined
    oldNode.effectTag = EFFECT_TAG.UPDATE
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
  if (oldNode === null || oldNode.type !== ELEMENT_TYPE.fragment) {
    const el = createElement(ELEMENT_TYPE.fragment, { children, ...newProps })
    el.parent = parent
    return el
  }
  oldNode.props = { ...oldNode.props, ...newProps, children }
  oldNode.effectTag = EFFECT_TAG.UPDATE
  oldNode.sibling = undefined
  return oldNode
}

function createChild(parent: VNode, child: unknown): VNode | null {
  if (
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    const el = createElement(ELEMENT_TYPE.text, { nodeValue: "" + child })
    el.parent = parent
    return el
  }

  if (typeof child === "object" && child !== null) {
    if (isVNode(child)) {
      const newNode = createElement(child.type, child.props)
      newNode.parent = parent
      newNode.effectTag = EFFECT_TAG.PLACEMENT
      if ("frozen" in child) newNode.frozen = child.frozen
      return newNode
    }
    if (Array.isArray(child)) {
      const el = createElement(ELEMENT_TYPE.fragment, {
        children: child,
        //array: true,
      })
      el.parent = parent
      return el
    }
    if (Signal.isSignal(child)) {
      return createChild(parent, child.value)
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
      vNode.effectTag = EFFECT_TAG.PLACEMENT
      return lastPlacedIndex
    } else {
      return oldIndex
    }
  } else {
    vNode.effectTag = EFFECT_TAG.PLACEMENT
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
      oldChild.effectTag = EFFECT_TAG.UPDATE
      oldChild.props.nodeValue = newChild
      return oldChild
    } else {
      const n = createElement(ELEMENT_TYPE.text, {
        nodeValue: newChild,
      })
      n.parent = parent
      n.effectTag = EFFECT_TAG.PLACEMENT
      n.index = index
      return n
    }
  }

  if (isVNode(newChild)) {
    const oldChild = existingChildren.get(
      newChild.props.key === undefined ? index : newChild.props.key
    )
    if (oldChild) {
      oldChild.effectTag = EFFECT_TAG.UPDATE
      oldChild.props = newChild.props
      if ("frozen" in newChild) oldChild.frozen = newChild.frozen
      oldChild.sibling = undefined
      oldChild.index = index
      return oldChild
    } else {
      const n = createElement(newChild.type, newChild.props)
      n.parent = parent
      n.effectTag = EFFECT_TAG.PLACEMENT
      n.index = index
      return n
    }
  }

  if (Array.isArray(newChild)) {
    const oldChild = existingChildren.get(index)
    if (oldChild) {
      oldChild.effectTag = EFFECT_TAG.UPDATE
      oldChild.props.children = newChild
      return oldChild
    } else {
      const n = createElement(ELEMENT_TYPE.fragment, {
        children: newChild,
      })
      n.parent = parent
      n.effectTag = EFFECT_TAG.PLACEMENT
      n.index = index
      return n
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

function deleteRemainingChildren(appCtx: AppContext, vNode: VNode) {
  let n: VNode | undefined = vNode
  while (n) {
    appCtx.requestDelete(n)
    n = n.sibling
  }
}

const missingKeyWarnings = new Set()
function warnForMissingKey(parent: VNode, child: VNode) {
  if (!__DEV__) return
  if (missingKeyWarnings.has(parent)) return
  if (parent.type === ELEMENT_TYPE.fragment && parent.props.array) {
    if (child.props.key === null || child.props.key === undefined) {
      const fn = getNearestParentFcTag(parent)
      keyWarn(
        `${fn} component produced a child in a list without a valid key prop`
      )
      missingKeyWarnings.add(parent)
    }
  }
}

const duplicateKeyWarnings = new Set()
function warnOnInvalidKey(
  parent: VNode,
  child: unknown,
  knownKeys: Set<string> | null
): Set<string> | null {
  if (!__DEV__) return null
  if (!isVNode(child)) {
    return knownKeys
  }
  warnForMissingKey(parent, child)
  const key = child.props.key
  if (typeof key !== "string") {
    return knownKeys
  }
  if (knownKeys === null) {
    knownKeys = new Set()
    knownKeys.add(key)
    return knownKeys
  }
  if (!knownKeys.has(key)) {
    knownKeys.add(key)
    return knownKeys
  }

  if (duplicateKeyWarnings.has(parent)) {
    return knownKeys
  }
  const fn = getNearestParentFcTag(parent)
  keyWarn(
    `${fn} component produced a child in a list with a duplicate key prop: "${key}"`
  )
  return knownKeys
}

function keyWarn(str: string) {
  console.error(
    `[kaioken]: ${str}. See https://kaioken.dev/keys-warning for more information.`
  )
}
const parentFcTagLookups = new WeakMap<VNode, string>()
function getNearestParentFcTag(vNode: VNode) {
  if (!parentFcTagLookups.has(vNode)) {
    let p: VNode | undefined = vNode.parent
    let fn: (Function & { displayName?: string }) | undefined
    while (!fn && p) {
      if (typeof p.type === "function") fn = p.type
      p = p.parent
    }
    parentFcTagLookups.set(
      vNode,
      `<${fn?.displayName || fn?.name || "Anonymous Function"} />`
    )
  }
  return parentFcTagLookups.get(vNode)
}
