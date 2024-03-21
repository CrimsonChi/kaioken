import { commitWork, createDom } from "./dom.js"
import { EffectTag, elementFreezeSymbol, elementTypes } from "./constants.js"
import { Component } from "./component.js"
import { isVNode, isValidChild } from "./utils.js"

export { GlobalContext, ctx, node, nodeToCtxMap, contexts, renderMode }
export type { GlobalContextOptions, KaiokenCtxFollowupFunc }

type KaiokenCtxFollowupFunc = (ctx: GlobalContext) => KaiokenCtxFollowupFunc[]
type VNode = Kaioken.VNode

interface GlobalContextOptions {
  root: HTMLElement
  /**
   * Sets the maximum render refresh time.
   * @default 50
   */
  maxFrameMs?: number
}

class GlobalContext {
  rootNode: VNode | undefined = undefined
  nextUnitOfWork: VNode | undefined = undefined
  treesInProgress: VNode[] = []
  currentTreeIndex = 0
  maxFrameMs = 50
  timeoutRef: number = -1

  hookIndex = 0
  deletions: VNode[] = []
  pendingEffects: Function[] = []
  updateQueued = false
  nodeUpdateQueue = new Set<VNode>()

  constructor(options?: GlobalContextOptions) {
    this.maxFrameMs = options?.maxFrameMs ?? 50
    contexts.add(this)
  }

  mount(node: VNode, container: HTMLElement) {
    this.rootNode = node
    nodeToCtxMap.set(this.rootNode, ctx.current)

    node.dom = container
    this.requestUpdate(node)
    this.workLoop()
    return this.rootNode
  }

  requestUpdate(node: VNode) {
    if (!this.vNodeContains(this.rootNode!, node)) return
    if (node.effectTag === EffectTag.DELETION) return

    node.prev = { ...node, prev: undefined }

    if (!this.nextUnitOfWork) {
      this.treesInProgress.push(node)
      this.nextUnitOfWork = node
      return
    }

    const treeIdx = this.treesInProgress.indexOf(node)
    // handle node as queued tree
    if (treeIdx !== -1) {
      if (treeIdx === this.currentTreeIndex) {
        this.treesInProgress[this.currentTreeIndex] = node
        this.nextUnitOfWork = node
      } else if (treeIdx < this.currentTreeIndex) {
        this.currentTreeIndex--
        this.treesInProgress.splice(treeIdx, 1)
        this.treesInProgress.push(node)
      }
      return
    }

    // handle node as child or parent of queued trees
    for (let i = 0; i < this.treesInProgress.length; i++) {
      if (this.vNodeContains(this.treesInProgress[i], node)) {
        if (i === this.currentTreeIndex) {
          // if req node is child of work node we can skip
          if (this.vNodeContains(this.nextUnitOfWork, node)) return
          // otherwise work node is a child of req node so we need to cancel & replace it
          this.nextUnitOfWork = node // jump back up the tree
        } else if (i < this.currentTreeIndex) {
          // already processed tree, create new tree with the node
          this.treesInProgress.push(node)
        }
        return
      } else if (this.vNodeContains(node, this.treesInProgress[i])) {
        if (i === this.currentTreeIndex) {
          // node contains current tree, replace it
          this.treesInProgress.splice(i, 1, node)
          this.nextUnitOfWork = node
        } else if (i < this.currentTreeIndex) {
          // node contains a tree that has already been processed
          this.currentTreeIndex--
          this.treesInProgress.splice(i, 1)
          this.treesInProgress.push(node)
        }
        return
      }
    }
    // node is not a child or parent of any queued trees, queue new tree
    this.treesInProgress.push(node)
  }

  queueEffect(callback: Function) {
    this.pendingEffects.push(callback)
  }

  applyRecursive(func: (node: VNode) => void) {
    if (!this.rootNode) return

    const nodes: VNode[] = [this.rootNode]
    const apply = (node: VNode) => {
      func(node)
      node.child && nodes.push(node.child)
      node.sibling && nodes.push(node.sibling)
    }
    while (nodes.length) apply(nodes.shift()!)
  }

  private workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    ctx.current = this
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex]

      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (!this.nextUnitOfWork && this.treesInProgress.length) {
      this.currentTreeIndex = 0
      const followUps: KaiokenCtxFollowupFunc[] = []
      this.deletions.forEach((d) => followUps.push(...commitWork(this, d)))
      this.deletions = []

      for (let i = 0; i < this.treesInProgress.length; i++) {
        followUps.push(...commitWork(this, this.treesInProgress[i]))
      }

      while (followUps.length) {
        followUps.push(...(followUps.shift()?.(this) ?? []))
      }

      this.treesInProgress = []
      while (this.pendingEffects.length) this.pendingEffects.shift()?.()
    }
    if ("requestIdleCallback" in window) {
      let didExec = false

      this.timeoutRef =
        (this.timeoutRef !== -1 && window.clearTimeout(this.timeoutRef),
        window.setTimeout(() => {
          if (!didExec) {
            this.workLoop()
            didExec = true
          }
        }, this.maxFrameMs))

      window.requestIdleCallback((deadline) => {
        if (!didExec) {
          this.workLoop(deadline)
          didExec = true
        }
      })
    } else {
      const w = window as Window
      w.requestAnimationFrame(() => {
        const start = performance.now()
        window.setTimeout(() => {
          const elapsed = performance.now() - start
          const deadline: IdleDeadline = {
            didTimeout: false,
            timeRemaining: function () {
              return Math.max(0, 50 - elapsed) // Simulate 50ms max idle time
            },
          }
          this.workLoop(deadline)
        }, 0)
      })
    }
  }

  private performUnitOfWork(vNode: VNode): VNode | void {
    const frozen = elementFreezeSymbol in vNode && !!vNode[elementFreezeSymbol]
    const skip = frozen && vNode.effectTag !== EffectTag.PLACEMENT
    if (!skip) {
      if (Component.isCtor(vNode.type)) {
        this.updateClassComponent(vNode)
      } else if (vNode.type instanceof Function) {
        this.updateFunctionComponent(vNode)
      } else if (vNode.type === elementTypes.fragment) {
        this.reconcileChildren(vNode, vNode.props.children)
      } else {
        this.updateHostComponent(vNode)
      }
      if (vNode.child) return vNode.child
    }

    let nextNode: VNode | undefined = vNode
    while (nextNode) {
      if (nextNode === this.treesInProgress[this.currentTreeIndex]) return
      if (nextNode.sibling) return nextNode.sibling
      nextNode = nextNode.parent
    }
  }

  private updateClassComponent(vNode: VNode) {
    this.hookIndex = 0
    node.current = vNode
    if (!vNode.instance) {
      const instance =
        vNode.prev?.instance ??
        new (vNode.type as { new (props: Record<string, unknown>): Component })(
          vNode.props
        )
      vNode.instance = instance
    } else {
      vNode.instance.props = vNode.props
    }

    this.reconcileChildren(vNode, [vNode.instance.render()].flat() as VNode[])
  }

  private updateFunctionComponent(vNode: VNode) {
    this.hookIndex = 0
    node.current = vNode

    this.reconcileChildren(
      vNode,
      [(vNode.type as Function)(vNode.props)].flat()
    )
  }

  private updateHostComponent(vNode: VNode) {
    const dom = vNode.dom ?? createDom(vNode)
    if (vNode.props.ref) {
      vNode.props.ref.current = dom
    }
    this.reconcileChildren(vNode, vNode.props.children)
  }

  private createChild(parent: VNode, child: any, index: number): VNode {
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

    if (elementFreezeSymbol in child) {
      Object.assign(newNode, {
        [elementFreezeSymbol]: child[elementFreezeSymbol],
      })
    }

    nodeToCtxMap.set(newNode, ctx.current)

    return newNode
  }

  private reconcileChildren(vNode: VNode, children: VNode[]) {
    let index = 0
    let prevOldNode: VNode | undefined = undefined
    let oldNode: VNode | undefined = vNode.prev && vNode.prev.child
    let prevNewNode: VNode | undefined = undefined
    let newNode: VNode | undefined = undefined

    let lastPlacedIndex = 0

    for (; !!oldNode && index < children.length; index++) {
      const child = children[index]

      const sameType = oldNode && child && child.type == oldNode.type

      if (sameType && oldNode) {
        if (child.props.key !== oldNode.props.key) break
        newNode = oldNode
        newNode.props = child.props
        newNode.parent = vNode
        newNode.effectTag = EffectTag.UPDATE
        if (elementFreezeSymbol in child) {
          Object.assign(newNode, {
            [elementFreezeSymbol]: child[elementFreezeSymbol],
          })
        }
        nodeToCtxMap.set(newNode, ctx.current)
      } else if (isValidChild(child) && !sameType) {
        newNode = this.createChild(vNode, child, index)
      }
      if (oldNode && !sameType) {
        oldNode.effectTag = EffectTag.DELETION
        if (oldNode.props.ref) {
          oldNode.props.ref.current = null
        }
        this.deletions.push(oldNode)
      }

      if (oldNode) {
        prevOldNode = oldNode
        oldNode = oldNode.sibling
      }

      if (index === 0) {
        vNode.child = newNode
      } else if (prevNewNode) {
        prevNewNode.sibling = newNode
      }
      if (newNode)
        lastPlacedIndex = this.placeChild(newNode, lastPlacedIndex, index)
      prevNewNode = newNode
    }

    // matched all children?
    if (index === children.length) {
      while (oldNode) {
        if (prevOldNode) {
          prevOldNode.sibling = undefined
        }
        prevOldNode = oldNode
        oldNode.effectTag = EffectTag.DELETION
        if (oldNode.props.ref) {
          oldNode.props.ref.current = null
        }
        this.deletions.push(oldNode)
        oldNode = oldNode.sibling
      }
      return
    }

    // just some good ol' insertions, baby
    if (!oldNode) {
      for (; index < children.length; index++) {
        const child = children[index]
        if (!isValidChild(child)) continue
        newNode = this.createChild(vNode, child, index)
        lastPlacedIndex = this.placeChild(newNode, lastPlacedIndex, index)
        if (index === 0) {
          vNode.child = newNode
        } else if (prevNewNode) {
          prevNewNode.sibling = newNode
        }
        prevNewNode = newNode
      }
      return
    }

    // deal with mismatched keys / unmatched children
    const existingChildren = this.mapRemainingChildren(oldNode)

    for (; index < children.length; index++) {
      const child = children[index]
      const newNode = this.updateFromMap(existingChildren, vNode, index, child)
      if (newNode !== undefined) {
        if (newNode.prev !== undefined) {
          existingChildren.delete(
            newNode.prev.props.key === undefined
              ? newNode.prev.index
              : newNode.prev.props.key
          )
        }
        if (elementFreezeSymbol in child) {
          Object.assign(newNode, {
            [elementFreezeSymbol]: child[elementFreezeSymbol],
          })
        }
        lastPlacedIndex = this.placeChild(newNode, lastPlacedIndex, index)
        nodeToCtxMap.set(newNode, ctx.current)

        if (index === 0) {
          vNode.child = newNode
        } else if (prevNewNode) {
          prevNewNode.sibling = newNode
        }
        prevNewNode = newNode
        if (index === children.length - 1) {
          prevNewNode.sibling = undefined
        }
      }
    }

    existingChildren.forEach((child) => {
      child.effectTag = EffectTag.DELETION
      if (child.props.ref) {
        child.props.ref.current = null
      }
      this.deletions.push(child)
    })
  }

  private placeChild(
    vNode: VNode,
    lastPlacedIndex: number,
    newIndex: number
  ): number {
    vNode.index = newIndex
    const prev = vNode.prev
    if (prev !== undefined) {
      const oldIndex = prev.index
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

  private updateFromMap(
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

  private mapRemainingChildren(vNode: VNode) {
    const map: Map<JSX.ElementKey, VNode> = new Map()
    let n: VNode | undefined = vNode
    while (n) {
      map.set(n.props.key === undefined ? n.index : n.props.key, n)
      n = n.sibling
    }
    return map
  }

  private vNodeContains(
    haystack: VNode,
    needle: VNode,
    checkSiblings = false
  ): boolean {
    return (
      haystack === needle ||
      (haystack.child && this.vNodeContains(haystack.child, needle, true)) ||
      (checkSiblings &&
        haystack.sibling &&
        this.vNodeContains(haystack.sibling, needle, true)) ||
      false
    )
  }
}

const nodeToCtxMap = new WeakMap<Kaioken.VNode, GlobalContext>()
const contexts = new Set<GlobalContext>()

const node = {
  current: undefined as Kaioken.VNode | undefined,
}

const ctx = {
  current: undefined as unknown as GlobalContext,
}

const renderMode = {
  current: "dom" as "dom" | "string",
}
