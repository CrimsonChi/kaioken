import { FLAG, $FRAGMENT } from "./constants.js"
import { isVNode, latest } from "./utils.js"
import { Signal } from "./signals/base.js"
import { __DEV__ } from "./env.js"
import { createElement, Fragment } from "./element.js"
import { flags } from "./flags.js"
import { ctx } from "./globals.js"

function setParent(child: Kaioken.VNode, parent: Kaioken.VNode) {
  child.parent = parent
  child.depth = parent.depth + 1
  if (parent.isMemoized || flags.get(parent.flags, FLAG.HAS_MEMO_ANCESTOR)) {
    child.flags = flags.set(child.flags, FLAG.HAS_MEMO_ANCESTOR)
  }
}

type VNode = Kaioken.VNode

function emitUpdateNode() {
  if (!("window" in globalThis)) return
  window.__kaioken?.profilingContext?.emit("updateNode", ctx.current)
}

function emitCreateNode() {
  if (!("window" in globalThis)) return
  window.__kaioken?.profilingContext?.emit("createNode", ctx.current)
}

export function reconcileChildren(parent: VNode, children: unknown) {
  if (Array.isArray(children)) {
    return reconcileChildrenArray(parent, children)
  }
  return reconcileSingleChild(parent, children)
}

function reconcileSingleChild(parent: VNode, child: unknown) {
  const deletions: VNode[] = (parent.deletions = [])
  const oldChild = parent.child
  if (oldChild === null) {
    return createChild(parent, child)
  }
  const oldSibling = oldChild.sibling
  const newNode = updateSlot(parent, oldChild, child)
  if (newNode !== null) {
    if (oldChild && oldChild !== newNode && !newNode.prev) {
      deleteRemainingChildren(parent, oldChild)
    } else if (oldSibling) {
      deleteRemainingChildren(parent, oldSibling)
    }
    return newNode
  }
  {
    // handle keyed children array -> keyed child
    const existingChildren = mapRemainingChildren(oldChild)
    const newNode = updateFromMap(existingChildren, parent, 0, child)
    if (newNode !== null) {
      if (newNode.prev !== null) {
        // node persisted, remove it from the list so it doesn't get deleted
        existingChildren.delete(
          newNode.prev.props.key === undefined
            ? newNode.prev.index
            : newNode.prev.props.key
        )
      }
      placeChild(newNode, 0, 0)
    }
    existingChildren.forEach((child) => deletions.push(child))
    return newNode
  }
}

function reconcileChildrenArray(parent: VNode, children: unknown[]) {
  const deletions: VNode[] = (parent.deletions = [])
  let resultingChild: VNode | null = null
  let prevNewChild: VNode | null = null

  let oldChild = parent.child
  let nextOldChild = null
  let lastPlacedIndex = 0
  let newIdx = 0

  for (; !!oldChild && newIdx < children.length; newIdx++) {
    if (oldChild.index > newIdx) {
      nextOldChild = oldChild
      oldChild = null
    } else {
      nextOldChild = oldChild.sibling
    }
    const newChild = updateSlot(parent, oldChild, children[newIdx])
    if (newChild === null) {
      if (oldChild === null) {
        oldChild = nextOldChild
      }
      break
    }
    // if (__DEV__) {
    //   knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
    // }
    if (oldChild && !newChild.prev) {
      deletions.push(oldChild)
    }
    lastPlacedIndex = placeChild(newChild, lastPlacedIndex, newIdx)
    if (prevNewChild === null) {
      resultingChild = newChild
    } else {
      prevNewChild.sibling = newChild
    }
    prevNewChild = newChild
    oldChild = nextOldChild
  }

  // matched all children?
  if (newIdx === children.length) {
    deleteRemainingChildren(parent, oldChild)
    return resultingChild
  }

  // just some good ol' insertions, baby
  if (oldChild === null) {
    for (; newIdx < children.length; newIdx++) {
      const newNode = createChild(parent, children[newIdx])
      if (newNode === null) continue
      // if (__DEV__) {
      //   knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
      // }
      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, newIdx)
      if (prevNewChild === null) {
        resultingChild = newNode
      } else {
        prevNewChild.sibling = newNode
      }
      prevNewChild = newNode
    }
    return resultingChild
  }

  // deal with mismatched keys / unmatched children
  const existingChildren = mapRemainingChildren(oldChild)

  for (; newIdx < children.length; newIdx++) {
    const newNode = updateFromMap(
      existingChildren,
      parent,
      newIdx,
      children[newIdx]
    )
    if (newNode !== null) {
      // if (__DEV__) {
      //   knownKeys = warnOnInvalidKey(vNode, children[newIdx], knownKeys)
      // }
      if (newNode.prev !== null) {
        // node persisted, remove it from the list so it doesn't get deleted
        existingChildren.delete(
          newNode.prev.props.key === undefined
            ? newNode.prev.index
            : newNode.prev.props.key
        )
      }
      lastPlacedIndex = placeChild(newNode, lastPlacedIndex, newIdx)
      if (prevNewChild === null) {
        resultingChild = newNode
      } else {
        prevNewChild.sibling = newNode
      }
      prevNewChild = newNode
    }
  }

  existingChildren.forEach((child) => deletions.push(child))
  return resultingChild
}

function updateSlot(parent: VNode, oldChild: VNode | null, child: unknown) {
  // Update the node if the keys match, otherwise return null.
  const key = oldChild?.props.key
  if (
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    if (key !== undefined) return null
    if (
      oldChild?.type === "#text" &&
      Signal.isSignal(oldChild.props.nodeValue)
    ) {
      return null
    }
    return updateTextNode(parent, oldChild, "" + child)
  }
  if (Signal.isSignal(child)) {
    if (!!oldChild && oldChild.props.nodeValue !== child) return null
    return updateTextNode(parent, oldChild, child)
  }
  if (isVNode(child)) {
    if (child.props.key !== key) return null
    return updateNode(parent, oldChild, child)
  }
  if (Array.isArray(child)) {
    if (key !== undefined) return null
    return updateFragment(parent, oldChild, child)
  }
  return null
}

function updateTextNode(
  parent: VNode,
  oldChild: VNode | null,
  content: string | Signal<JSX.PrimitiveChild>
) {
  if (oldChild === null || oldChild.type !== "#text") {
    if (__DEV__) {
      emitCreateNode()
    }
    const newChild = createElement("#text", { nodeValue: content })
    setParent(newChild, parent)
    return newChild
  } else {
    if (__DEV__) {
      emitUpdateNode()
    }
    oldChild.props.nodeValue = content
    oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
    oldChild.sibling = null
    return oldChild
  }
}

function updateNode(parent: VNode, oldChild: VNode | null, newChild: VNode) {
  let nodeType = newChild.type
  if (__DEV__) {
    if (typeof nodeType === "function") {
      nodeType = latest(nodeType)
    }
  }
  if (nodeType === $FRAGMENT) {
    return updateFragment(
      parent,
      oldChild,
      (newChild.props.children as VNode[]) || [],
      newChild.props
    )
  }
  if (oldChild?.type === nodeType) {
    if (__DEV__) {
      emitUpdateNode()
    }
    oldChild.index = 0
    oldChild.props = newChild.props
    oldChild.sibling = null
    oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
    oldChild.memoizedProps = newChild.memoizedProps
    return oldChild
  }
  if (__DEV__) {
    emitCreateNode()
  }
  const created = createElement(nodeType, newChild.props)
  setParent(created, parent)
  return created
}

function updateFragment(
  parent: VNode,
  oldChild: VNode | null,
  children: unknown[],
  newProps = {}
) {
  if (oldChild === null || oldChild.type !== $FRAGMENT) {
    if (__DEV__) {
      emitCreateNode()
    }
    const el = createElement($FRAGMENT, { children, ...newProps })
    setParent(el, parent)
    return el
  }
  if (__DEV__) {
    emitUpdateNode()
  }
  oldChild.props = { ...oldChild.props, ...newProps, children }
  oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
  oldChild.sibling = null
  return oldChild
}

function createChild(parent: VNode, child: unknown): VNode | null {
  if (
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    if (__DEV__) {
      emitCreateNode()
    }
    const el = createElement("#text", {
      nodeValue: "" + child,
    })
    setParent(el, parent)
    return el
  }

  if (Signal.isSignal(child)) {
    if (__DEV__) {
      emitCreateNode()
    }
    const el = createElement("#text", {
      nodeValue: child,
    })
    setParent(el, parent)
    return el
  }

  if (isVNode(child)) {
    if (__DEV__) {
      emitCreateNode()
    }
    const newNode = createElement(child.type, child.props)
    setParent(newNode, parent)
    newNode.flags = flags.set(newNode.flags, FLAG.PLACEMENT)
    return newNode
  }

  if (Array.isArray(child)) {
    if (__DEV__) {
      emitCreateNode()
    }
    const el = Fragment({ children: child })
    setParent(el, parent)
    return el
  }

  return null
}

function placeChild(
  child: VNode | null,
  lastPlacedIndex: number,
  newIndex: number
): number {
  if (child === null) return lastPlacedIndex
  child.index = newIndex
  if (child.prev !== null) {
    const oldIndex = child.prev.index
    if (oldIndex < lastPlacedIndex) {
      child.flags = flags.set(child.flags, FLAG.PLACEMENT)
      return lastPlacedIndex
    } else {
      return oldIndex
    }
  } else {
    child.flags = flags.set(child.flags, FLAG.PLACEMENT)
    return lastPlacedIndex
  }
}

function updateFromMap(
  existingChildren: Map<JSX.ElementKey, VNode>,
  parent: VNode,
  index: number,
  child: any
): VNode | null {
  const isSig = Signal.isSignal(child)
  if (
    isSig ||
    (typeof child === "string" && child !== "") ||
    typeof child === "number" ||
    typeof child === "bigint"
  ) {
    const oldChild = existingChildren.get(index)
    if (oldChild) {
      if (oldChild.props.nodeValue === child) {
        oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
        oldChild.props.nodeValue = child
        return oldChild
      }
      if (
        oldChild.type === "#text" &&
        Signal.isSignal(oldChild.props.nodeValue)
      ) {
        oldChild.cleanups?.["nodeValue"]?.()
      }
    }

    if (__DEV__) {
      emitCreateNode()
    }
    const newChild = createElement("#text", {
      nodeValue: child,
    })
    setParent(newChild, parent)
    newChild.flags = flags.set(newChild.flags, FLAG.PLACEMENT)
    newChild.index = index
    return newChild
  }

  if (isVNode(child)) {
    const oldChild = existingChildren.get(
      child.props.key === undefined ? index : child.props.key
    )
    if (oldChild?.type === child.type) {
      if (__DEV__) {
        emitUpdateNode()
      }
      oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
      oldChild.props = child.props
      oldChild.sibling = null
      oldChild.index = index
      return oldChild
    } else {
      if (__DEV__) {
        emitCreateNode()
      }
      const newChild = createElement(child.type, child.props)
      setParent(newChild, parent)
      newChild.flags = flags.set(newChild.flags, FLAG.PLACEMENT)
      newChild.index = index
      return newChild
    }
  }

  if (Array.isArray(child)) {
    const oldChild = existingChildren.get(index)
    if (oldChild) {
      if (__DEV__) {
        emitUpdateNode()
      }
      oldChild.flags = flags.set(oldChild.flags, FLAG.UPDATE)
      oldChild.props.children = child
      return oldChild
    } else {
      if (__DEV__) {
        emitCreateNode()
      }
      const newChild = Fragment({ children: child })
      setParent(newChild, parent)
      newChild.flags = flags.set(newChild.flags, FLAG.PLACEMENT)
      newChild.index = index
      return newChild
    }
  }

  return null
}

function mapRemainingChildren(child: VNode | null) {
  const map: Map<JSX.ElementKey, VNode> = new Map()
  while (child) {
    map.set(
      child.props.key === undefined ? child.index : child.props.key,
      child
    )
    child = child.sibling
  }
  return map
}

function deleteRemainingChildren(parent: VNode, child: VNode | null) {
  while (child) {
    parent.deletions!.push(child)
    child = child.sibling
  }
}

// const duplicateKeyWarnings = new Set()
// function warnOnInvalidKey(
//   parent: VNode,
//   child: unknown,
//   knownKeys: Set<string> | null
// ): Set<string> | null {
//   if (!__DEV__) return null
//   if (!isVNode(child)) {
//     return knownKeys
//   }
//   warnForMissingKey(parent, child)
//   const key = child.props.key
//   if (typeof key !== "string") {
//     return knownKeys
//   }
//   if (knownKeys === null) {
//     knownKeys = new Set()
//     knownKeys.add(key)
//     return knownKeys
//   }
//   if (!knownKeys.has(key)) {
//     knownKeys.add(key)
//     return knownKeys
//   }

//   if (duplicateKeyWarnings.has(parent)) {
//     return knownKeys
//   }
//   const fn = getNearestParentFcTag(parent)
//   keyWarn(
//     `${fn} component produced a child in a list with a duplicate key prop: "${key}"`
//   )
//   return knownKeys
// }

// const missingKeyWarnings = new Set()
// function warnForMissingKey(parent: VNode, child: VNode) {
//   if (!__DEV__) return
//   if (missingKeyWarnings.has(parent)) return
//   if (parent.type !== fragmentSymbol) return
//   if (child.props.key === null || child.props.key === undefined) {
//     const fn = getNearestParentFcTag(parent)
//     keyWarn(
//       `${fn} component produced a child in a list without a valid key prop`
//     )
//     missingKeyWarnings.add(parent)
//   }
// }

// function keyWarn(str: string) {
//   console.error(
//     `[kaioken]: ${str}. See https://kaioken.dev/keys-warning for more information.`
//   )
// }
// const parentFcTagLookups = new WeakMap<VNode, string>()
// function getNearestParentFcTag(vNode: VNode) {
//   if (!parentFcTagLookups.has(vNode)) {
//     let p: VNode | undefined = vNode.parent
//     let fn: (Function & { displayName?: string }) | undefined
//     while (!fn && p) {
//       if (typeof p.type === "function") fn = p.type
//       p = p.parent
//     }
//     parentFcTagLookups.set(
//       vNode,
//       `<${fn?.displayName || fn?.name || "Anonymous Function"} />`
//     )
//   }
//   return parentFcTagLookups.get(vNode)
// }
