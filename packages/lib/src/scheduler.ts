import type { AppContext } from "./appContext"
import type {
  ContextProviderNode,
  DomVNode,
  FunctionVNode,
} from "./types.utils"
import { flags } from "./flags.js"
import {
  $CONTEXT_PROVIDER,
  CONSECUTIVE_DIRTY_LIMIT,
  FLAG,
} from "./constants.js"
import { commitWork, createDom, hydrateDom } from "./dom.js"
import { __DEV__ } from "./env.js"
import { KaiokenError } from "./error.js"
import { ctx, hookIndex, node, nodeToCtxMap, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { assertValidElementProps } from "./props.js"
import { reconcileChildren } from "./reconciler.js"
import {
  willMemoBlockUpdate,
  latest,
  traverseApply,
  vNodeContains,
  isExoticType,
} from "./utils.js"
import { Signal } from "./signals/base.js"

type VNode = Kaioken.VNode

export class Scheduler {
  private nextUnitOfWork: VNode | null = null
  private treesInProgress: VNode[] = []
  private currentTreeIndex = 0
  private isRunning = false
  private nextIdleEffects: ((scheduler: this) => void)[] = []
  private deletions: VNode[] = []
  private frameDeadline = 0
  private pendingCallback: IdleRequestCallback | null = null
  private channel: MessageChannel
  private frameHandle: number | null = null
  private isImmediateEffectsMode = false
  private immediateEffectDirtiedRender = false
  private isRenderDirtied = false
  private consecutiveDirtyCount = 0
  private pendingContextChanges = new Set<ContextProviderNode<any>>()
  private effectCallbacks = {
    pre: [] as Function[],
    post: [] as Function[],
  }

  constructor(private appCtx: AppContext<any>, private maxFrameMs = 50) {
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
    this.nextUnitOfWork = null
    this.treesInProgress = []
    this.currentTreeIndex = 0
    this.nextIdleEffects = []
    this.deletions = []
    this.effectCallbacks = { pre: [], post: [] }
    this.frameDeadline = 0
    this.pendingCallback = null
    this.sleep()
  }

  wake() {
    if (this.isRunning) return
    this.isRunning = true
    this.requestIdleCallback(this.workLoop.bind(this))
  }

  sleep() {
    this.isRunning = false
    if (this.frameHandle !== null) {
      globalThis.cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  nextIdle(fn: (scheduler: this) => void, wakeUpIfIdle = true) {
    this.nextIdleEffects.push(fn)
    if (wakeUpIfIdle) this.wake()
  }

  flushSync() {
    if (this.frameHandle !== null) {
      globalThis.cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    this.workLoop()
  }

  queueUpdate(vNode: VNode) {
    // In immediate effect mode (useLayoutEffect), immediately mark the render as dirty
    if (this.isImmediateEffectsMode) {
      this.immediateEffectDirtiedRender = true
    }

    // If this node is currently being rendered, just mark it dirty
    if (node.current === vNode) {
      if (__DEV__) {
        window.__kaioken?.profilingContext?.emit("updateDirtied", this.appCtx)
      }
      this.isRenderDirtied = true
      return
    }

    // If it's already the next unit of work, no need to queue again
    if (this.nextUnitOfWork === vNode) {
      return
    }

    if (this.nextUnitOfWork === null) {
      this.treesInProgress.push(vNode)
      this.nextUnitOfWork = vNode
      return this.wake()
    }

    // Check if the node is already in the treesInProgress queue
    const treeIdx = this.treesInProgress.indexOf(vNode)
    if (treeIdx !== -1) {
      if (treeIdx === this.currentTreeIndex) {
        // Replace current node if it's being worked on now
        this.treesInProgress[treeIdx] = vNode
        this.nextUnitOfWork = vNode
      } else if (treeIdx < this.currentTreeIndex) {
        // It was already processed; requeue it to the end
        this.currentTreeIndex--
        this.treesInProgress.splice(treeIdx, 1)
        this.treesInProgress.push(vNode)
      }
      return
    }

    const nodeDepth = vNode.depth

    // Check if this node is a descendant of any trees already queued
    for (let i = 0; i < this.treesInProgress.length; i++) {
      const tree = this.treesInProgress[i]
      if (tree.depth > nodeDepth) continue // Can't be an ancestor
      if (!vNodeContains(tree, vNode)) continue

      if (i === this.currentTreeIndex) {
        // It's a child of the currently worked-on tree
        // If it's deeper within the same tree, we can skip
        if (vNodeContains(this.nextUnitOfWork, vNode)) return
        // If it's not in the current work subtree, move back up to it
        this.nextUnitOfWork = vNode
      } else if (i < this.currentTreeIndex) {
        // It's a descendant of an already processed tree; treat as a new update
        this.treesInProgress.push(vNode)
      }

      return
    }

    // Check if this node contains any of the currently queued trees
    let didReplaceTree = false
    let shouldQueueAtEnd = false
    for (let i = 0; i < this.treesInProgress.length; ) {
      const tree = this.treesInProgress[i]
      if (tree.depth < nodeDepth || !vNodeContains(vNode, tree)) {
        i++
        continue
      }
      // This node contains another update root, replace it

      if (i === this.currentTreeIndex) {
        if (!didReplaceTree) {
          this.treesInProgress.splice(i, 1, vNode)
          this.nextUnitOfWork = vNode
          didReplaceTree = true
          i++ // advance past replaced node
        } else {
          this.treesInProgress.splice(i, 1)
          // no increment
        }
      } else if (i < this.currentTreeIndex) {
        this.currentTreeIndex--
        this.treesInProgress.splice(i, 1)
        if (!didReplaceTree) {
          shouldQueueAtEnd = true
          didReplaceTree = true
        }
        // no increment
      } else {
        // i > currentTreeIndex
        this.treesInProgress.splice(i, 1)
        if (!didReplaceTree) {
          shouldQueueAtEnd = true
          didReplaceTree = true
        }
        // no increment
      }
    }
    if (!shouldQueueAtEnd && didReplaceTree) {
      return
    }
    // If it doesn't overlap with any queued tree, queue as new independent update root
    this.treesInProgress.push(vNode)
  }

  queueDelete(vNode: VNode) {
    traverseApply(vNode, (n) => (n.flags = flags.set(n.flags, FLAG.DELETION)))
    this.deletions.push(vNode)
  }

  private isFlushReady() {
    return (
      !this.nextUnitOfWork &&
      (this.deletions.length || this.treesInProgress.length)
    )
  }

  private workLoop(deadline?: IdleDeadline): void {
    if (__DEV__) {
      window.__kaioken?.profilingContext?.beginTick(this.appCtx)
    }
    ctx.current = this.appCtx
    while (this.nextUnitOfWork) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex] ??
        this.queueBlockedContextDependencyRoots()

      if ((deadline?.timeRemaining() ?? 1) < 1) break
    }

    if (this.isFlushReady()) {
      while (this.deletions.length) {
        commitWork(this.deletions.shift()!)
      }
      const treesInProgress = [...this.treesInProgress]
      this.treesInProgress = []
      this.currentTreeIndex = 0
      for (const tree of treesInProgress) {
        commitWork(tree)
      }

      this.isImmediateEffectsMode = true
      this.flushEffects(this.effectCallbacks.pre)
      this.isImmediateEffectsMode = false

      if (this.immediateEffectDirtiedRender) {
        this.checkForTooManyConsecutiveDirtyRenders()
        this.flushEffects(this.effectCallbacks.post)
        this.immediateEffectDirtiedRender = false
        this.consecutiveDirtyCount++
        if (__DEV__) {
          window.__kaioken?.profilingContext?.endTick(this.appCtx)
          window.__kaioken?.profilingContext?.emit("updateDirtied", this.appCtx)
        }
        return this.workLoop()
      }
      this.consecutiveDirtyCount = 0

      this.flushEffects(this.effectCallbacks.post)
      window.__kaioken!.emit("update", this.appCtx)
      if (__DEV__) {
        window.__kaioken?.profilingContext?.emit("update", this.appCtx)
      }
    }

    if (!this.nextUnitOfWork) {
      this.sleep()
      while (this.nextIdleEffects.length) {
        this.nextIdleEffects.shift()!(this)
      }
      if (__DEV__) {
        window.__kaioken?.profilingContext?.endTick(this.appCtx)
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

  private queueBlockedContextDependencyRoots(): VNode | null {
    if (this.pendingContextChanges.size === 0) return null

    // TODO: it's possible that a 'job' created by this process is
    // blocked by a parent memo after a queueUpdate -> replaceTree action.
    // To prevent this, we might need to add these to a distinct queue.
    const jobRoots: VNode[] = []
    this.pendingContextChanges.forEach((provider) => {
      provider.props.dependents.forEach((dep) => {
        if (!willMemoBlockUpdate(provider, dep)) return
        const depDepth = dep.depth
        for (let i = 0; i < jobRoots.length; i++) {
          const root = jobRoots[i]
          const rootDepth = root.depth
          if (depDepth > rootDepth && vNodeContains(root, dep)) {
            if (willMemoBlockUpdate(root, dep)) {
              // root is a parent of dep and there's a memo between them, prevent consolidation and queue as new root
              break
            }
            return
          }
          if (depDepth < rootDepth && vNodeContains(dep, root)) {
            jobRoots[i] = dep
            return
          }
        }
        jobRoots.push(dep)
      })
    })

    this.pendingContextChanges.clear()
    this.treesInProgress.push(...jobRoots)
    return jobRoots[0] ?? null
  }

  private performUnitOfWork(vNode: VNode): VNode | void {
    let renderChild = true
    try {
      const { props } = vNode
      if (typeof vNode.type === "string") {
        this.updateHostComponent(vNode as DomVNode)
      } else if (isExoticType(vNode.type)) {
        if (vNode.type === $CONTEXT_PROVIDER) {
          const asProvider = vNode as ContextProviderNode<any>
          const { dependents, value } = asProvider.props
          if (
            dependents.size &&
            asProvider.prev &&
            asProvider.prev.props.value !== value
          ) {
            this.pendingContextChanges.add(asProvider)
          }
        }
        vNode.child = reconcileChildren(vNode, props.children)
        vNode.deletions?.forEach((d) => this.queueDelete(d))
      } else {
        renderChild = this.updateFunctionComponent(vNode as FunctionVNode)
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

    if (renderChild && vNode.child) {
      return vNode.child
    }

    let nextNode: VNode | null = vNode
    while (nextNode) {
      // queue effects upon ascent
      if (nextNode.immediateEffects) {
        this.effectCallbacks.pre.push(...nextNode.immediateEffects)
        nextNode.immediateEffects = undefined
      }
      if (nextNode.effects) {
        this.effectCallbacks.post.push(...nextNode.effects)
        nextNode.effects = undefined
      }
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

  private updateFunctionComponent(vNode: FunctionVNode) {
    const { type, props, subs, prev, isMemoized } = vNode
    if (isMemoized) {
      vNode.memoizedProps = props
      if (
        prev?.memoizedProps &&
        vNode.arePropsEqual!(prev.memoizedProps, props) &&
        !vNode.hmrUpdated
      ) {
        return false
      }
    }
    try {
      node.current = vNode
      nodeToCtxMap.set(vNode, this.appCtx)
      let newChild
      let renderTryCount = 0
      do {
        this.isRenderDirtied = false
        hookIndex.current = 0

        /**
         * remove previous signal subscriptions (if any) every render.
         * this prevents no-longer-observed signals from triggering updates
         * in components that are not currently using them.
         */
        while (subs?.length) Signal.unsubscribe(vNode, subs.pop()!)

        if (__DEV__) {
          newChild = latest(type)(props)
          delete vNode.hmrUpdated
          if (++renderTryCount > CONSECUTIVE_DIRTY_LIMIT) {
            throw new KaiokenError({
              message:
                "Too many re-renders. Kaioken limits the number of renders to prevent an infinite loop.",
              fatal: true,
              vNode,
            })
          }
          continue
        }
        newChild = type(props)
      } while (this.isRenderDirtied)
      vNode.child = reconcileChildren(vNode, newChild)
      vNode.deletions?.forEach((d) => this.queueDelete(d))
      return true
    } finally {
      node.current = null
    }
  }

  private updateHostComponent(vNode: DomVNode) {
    const { props } = vNode
    if (__DEV__) {
      assertValidElementProps(vNode)
    }
    if (!vNode.dom) {
      if (renderMode.current === "hydrate") {
        hydrateDom(vNode)
      } else {
        vNode.dom = createDom(vNode)
      }
      if (__DEV__) {
        // @ts-expect-error we apply vNode to the dom node
        vNode.dom.__kaiokenNode = vNode
      }
    }
    // text should _never_ have children
    if (vNode.type !== "#text") {
      vNode.child = reconcileChildren(vNode, props.children)
      vNode.deletions?.forEach((d) => this.queueDelete(d))
    }

    if (vNode.child && renderMode.current === "hydrate") {
      hydrationStack.push(vNode.dom!)
    }
  }

  private checkForTooManyConsecutiveDirtyRenders() {
    if (this.consecutiveDirtyCount > CONSECUTIVE_DIRTY_LIMIT) {
      throw new KaiokenError(
        "Maximum update depth exceeded. This can happen when a component repeatedly calls setState during render or in useLayoutEffect. Kaioken limits the number of nested updates to prevent infinite loops."
      )
    }
  }

  private flushEffects(effectArr: Function[]) {
    while (effectArr.length) effectArr.shift()!()
  }
}
