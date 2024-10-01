import type { AppContext } from "./appContext"
import { bitmapOps } from "./bitmap.js"
import {
  CONSECUTIVE_DIRTY_LIMIT,
  contextProviderSymbol,
  FLAG,
  fragmentSymbol,
} from "./constants.js"
import { commitWork, createDom, hydrateDom } from "./dom.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { ctx, node, nodeToCtxMap, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { assertValidElementProps } from "./props.js"
import { reconcileChildren } from "./reconciler.js"
import { postOrderApply, traverseApply, vNodeContains } from "./utils.js"

type VNode = Kaioken.VNode
type FunctionNode = VNode & { type: (...args: any) => any }

export class Scheduler {
  private nextUnitOfWork: VNode | undefined = undefined
  private treesInProgress: VNode[] = []
  private currentTreeIndex = 0
  private isRunning = false
  private nextIdleEffects: ((scheduler: this) => void)[] = []
  private deletions: VNode[] = []
  private frameDeadline = 0
  private pendingCallback: IdleRequestCallback | undefined
  private channel: MessageChannel
  private frameHandle: number | null = null
  private isImmediateEffectsMode = false
  private immediateEffectDirtiedRender = false
  private isRenderDirtied = false
  private consecutiveDirtyCount = 0

  constructor(
    private appCtx: AppContext<any>,
    private maxFrameMs = 50
  ) {
    const timeRemaining = () => this.frameDeadline - window.performance.now()
    const deadline = {
      didTimeout: false,
      timeRemaining,
    }
    this.channel = new MessageChannel()
    this.channel.port2.onmessage = () => {
      if (typeof this.pendingCallback === "function") {
        this.pendingCallback(deadline)
      }
    }
  }

  clear() {
    this.nextUnitOfWork = undefined
    this.treesInProgress = []
    this.currentTreeIndex = 0
    this.nextIdleEffects = []
    this.deletions = []
    this.frameDeadline = 0
    this.pendingCallback = undefined
    this.sleep(true)
  }

  wake() {
    if (this.isRunning) return
    this.isRunning = true
    this.requestIdleCallback(this.workLoop.bind(this))
  }

  sleep(force = false) {
    if (!this.isRunning && !force) return
    this.isRunning = false
    if (this.frameHandle !== null) {
      globalThis.cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  nextIdle(fn: (scheduler: this) => void) {
    this.nextIdleEffects.push(fn)
    this.wake()
  }

  queueUpdate(vNode: VNode) {
    if ("frozen" in vNode) {
      vNode.frozen = false
    }
    if (this.isImmediateEffectsMode) {
      this.immediateEffectDirtiedRender = true
    }

    if (node.current === vNode) {
      this.isRenderDirtied = true
      return
    }

    if (this.nextUnitOfWork === vNode) {
      return
    }

    if (this.nextUnitOfWork === undefined) {
      this.treesInProgress.push(vNode)
      this.nextUnitOfWork = vNode
      return this.wake()
    }

    const treeIdx = this.treesInProgress.indexOf(vNode)
    // handle node as queued tree
    if (treeIdx !== -1) {
      if (treeIdx === this.currentTreeIndex) {
        this.treesInProgress[this.currentTreeIndex] = vNode
        this.nextUnitOfWork = vNode
      } else if (treeIdx < this.currentTreeIndex) {
        this.currentTreeIndex--
        this.treesInProgress.splice(treeIdx, 1)
        this.treesInProgress.push(vNode)
      }
      return
    }

    const nodeDepth = vNode.depth!
    // handle node as child of queued trees
    for (let i = 0; i < this.treesInProgress.length; i++) {
      const treeDepth = this.treesInProgress[i].depth!
      if (treeDepth > nodeDepth) continue
      if (vNodeContains(this.treesInProgress[i], vNode)) {
        if (i === this.currentTreeIndex) {
          // if req node is child of work node we can skip
          if (vNodeContains(this.nextUnitOfWork, vNode)) return
          // otherwise work node is a child of req node so we need to cancel & replace it
          this.nextUnitOfWork = vNode // jump back up the tree
        } else if (i < this.currentTreeIndex) {
          // already processed tree, create new tree with the node
          this.treesInProgress.push(vNode)
        }
        return
      }
    }

    let didNodeUsurp = false
    for (let i = 0; i < this.treesInProgress.length; i++) {
      // does node contain tree?
      const treeDepth = this.treesInProgress[i].depth!
      if (treeDepth < nodeDepth) continue

      if (vNodeContains(vNode, this.treesInProgress[i])) {
        // TODO: continue consuming trees in progress of the req node contains them!
        if (i === this.currentTreeIndex) {
          // node contains current tree, replace it
          if (!didNodeUsurp) {
            this.treesInProgress.splice(i, 1, vNode)
            this.nextUnitOfWork = vNode
            didNodeUsurp = true
          } else {
            this.treesInProgress.splice(i, 1)
          }
        } else if (i < this.currentTreeIndex) {
          // node contains a tree that has already been processed
          this.currentTreeIndex--
          this.treesInProgress.splice(i, 1)
          if (!didNodeUsurp) {
            this.treesInProgress.push(vNode)
          }
        } else {
          // node contains a tree that has not yet been processed, 'usurp' the tree
          if (!didNodeUsurp) {
            this.treesInProgress.splice(i, 1, vNode)
            didNodeUsurp = true
          } else {
            this.treesInProgress.splice(i, 1)
          }
        }
      }
    }
    if (didNodeUsurp) return
    // node is not a child or parent of any queued trees, queue new tree
    this.treesInProgress.push(vNode)
  }

  queueDelete(vNode: VNode) {
    traverseApply(vNode, (n) => bitmapOps.setFlag(n, FLAG.DELETION))
    this.deletions.push(vNode)
  }

  queueEffect(vNode: VNode, effect: Function) {
    ;(vNode.effects ??= []).push(effect)
  }

  queueImmediateEffect(vNode: VNode, effect: Function) {
    ;(vNode.immediateEffects ??= []).push(effect)
  }

  private isFlushReady() {
    return (
      !this.nextUnitOfWork &&
      (this.deletions.length || this.treesInProgress.length)
    )
  }

  private workLoop(deadline?: IdleDeadline): void {
    ctx.current = this.appCtx
    let shouldYield = false
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex]

      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    if (this.isFlushReady()) {
      while (this.deletions.length) {
        commitWork(this.deletions.shift()!)
      }
      const tip = [...this.treesInProgress]
      this.treesInProgress = []
      this.currentTreeIndex = 0
      for (const t of tip) {
        commitWork(t)
      }

      this.isImmediateEffectsMode = true
      for (const t of tip) {
        fireEffects(t, true)
      }
      this.isImmediateEffectsMode = false

      if (this.immediateEffectDirtiedRender) {
        this.checkForTooManyConsecutiveDirtyRenders()
        while (tip.length) {
          fireEffects(tip.shift()!)
        }
        this.immediateEffectDirtiedRender = false
        this.consecutiveDirtyCount++
        return this.workLoop()
      }
      this.consecutiveDirtyCount = 0

      while (tip.length) {
        fireEffects(tip.shift()!)
      }
      window.__kaioken!.emit("update", this.appCtx)
    }

    if (!this.nextUnitOfWork) {
      this.sleep()
      while (this.nextIdleEffects.length) {
        this.nextIdleEffects.shift()!(this)
      }
      return
    }

    this.requestIdleCallback(this.workLoop.bind(this))
  }

  private requestIdleCallback(callback: IdleRequestCallback) {
    this.frameHandle = globalThis.requestAnimationFrame((time) => {
      this.frameDeadline = time + this.maxFrameMs
      this.pendingCallback = callback
      this.channel.port1.postMessage(null)
    })
  }

  private performUnitOfWork(vNode: VNode): VNode | void {
    const frozen = "frozen" in vNode && vNode.frozen === true
    const skip = frozen && !bitmapOps.isFlagSet(vNode, FLAG.PLACEMENT)
    if (!skip) {
      try {
        if (typeof vNode.type === "function") {
          this.updateFunctionComponent(vNode as FunctionNode)
        } else if (
          vNode.type === fragmentSymbol ||
          vNode.type === contextProviderSymbol
        ) {
          vNode.child =
            reconcileChildren(
              this.appCtx,
              vNode,
              vNode.child || null,
              vNode.props.children
            ) || undefined
        } else {
          this.updateHostComponent(vNode)
        }
      } catch (error) {
        window.__kaioken?.emit(
          "error",
          this.appCtx,
          error instanceof Error ? error : new Error(String(error))
        )
        if (KaiokenError.isKaiokenError(error)) {
          if (error.customNodeStack) {
            setTimeout(() => {
              throw new Error(error.customNodeStack)
            })
          }
          if (error.fatal) {
            throw error
          }
          console.error(error)
          return
        }
        setTimeout(() => {
          throw error
        })
      }
      if (vNode.child) {
        if (renderMode.current === "hydrate" && vNode.dom) {
          hydrationStack.push(vNode.dom)
        }
        return vNode.child
      }
    }

    let nextNode: VNode | undefined = vNode
    while (nextNode) {
      if (nextNode === this.treesInProgress[this.currentTreeIndex]) return
      if (nextNode.sibling) {
        return nextNode.sibling
      }

      nextNode = nextNode.parent
      if (renderMode.current === "hydrate" && nextNode?.dom) {
        hydrationStack.pop()
      }
    }
  }

  private updateFunctionComponent(vNode: FunctionNode) {
    try {
      node.current = vNode
      nodeToCtxMap.set(vNode, this.appCtx)
      let newChildren
      let renderTryCount = 0
      do {
        this.isRenderDirtied = false
        this.appCtx.hookIndex = 0
        newChildren = vNode.type(vNode.props)
        if (++renderTryCount > CONSECUTIVE_DIRTY_LIMIT) {
          throw new KaiokenError({
            message:
              "Too many re-renders. Kaioken limits the number of renders to prevent an infinite loop.",
            fatal: true,
            vNode,
          })
        }
      } while (this.isRenderDirtied)
      vNode.child =
        reconcileChildren(
          this.appCtx,
          vNode,
          vNode.child || null,
          newChildren
        ) || undefined
    } finally {
      node.current = undefined
    }
  }

  private updateHostComponent(vNode: VNode) {
    try {
      node.current = vNode
      assertValidElementProps(vNode)
      if (!vNode.dom) {
        if (renderMode.current === "hydrate") {
          hydrateDom(vNode)
        } else {
          vNode.dom = createDom(vNode)
        }
      }

      if (vNode.dom) {
        // @ts-expect-error we apply vNode to the dom node
        vNode.dom!.__kaiokenNode = vNode
      }

      vNode.child =
        reconcileChildren(
          this.appCtx,
          vNode,
          vNode.child || null,
          vNode.props.children
        ) || undefined
    } finally {
      node.current = undefined
    }
  }

  private checkForTooManyConsecutiveDirtyRenders() {
    if (this.consecutiveDirtyCount > CONSECUTIVE_DIRTY_LIMIT) {
      throw new KaiokenError(
        "Maximum update depth exceeded. This can happen when a component repeatedly calls setState during render or in useLayoutEffect. Kaioken limits the number of nested updates to prevent infinite loops."
      )
    }
  }
}

function fireEffects(tree: VNode, immediate?: boolean) {
  postOrderApply(tree, {
    onAscent(node) {
      const arr = immediate ? node.immediateEffects : node.effects
      while (arr?.length) arr.shift()!()
    },
  })
}
