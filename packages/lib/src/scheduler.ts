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
import { KiruError } from "./error.js"
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

type VNode = Kiru.VNode

export interface Scheduler {
  clear(): void
  wake(): void
  sleep(): void
  nextIdle(fn: (scheduler: Scheduler) => void, wakeUpIfIdle?: boolean): void
  flushSync(): void
  queueUpdate(vNode: VNode): void
  queueDelete(vNode: VNode): void
}

export function createScheduler(
  appCtx: AppContext<any>,
  maxFrameMs = 50
): Scheduler {
  let nextUnitOfWork: VNode | null = null
  let treesInProgress: VNode[] = []
  let currentTreeIndex = 0
  let isRunning = false
  let nextIdleEffects: ((scheduler: Scheduler) => void)[] = []
  let deletions: VNode[] = []
  let frameDeadline = 0
  let pendingCallback: IdleRequestCallback | null = null
  let frameHandle: number | null = null
  let isImmediateEffectsMode = false
  let immediateEffectDirtiedRender = false
  let isRenderDirtied = false
  let consecutiveDirtyCount = 0
  let pendingContextChanges = new Set<ContextProviderNode<any>>()
  let effectCallbacks = {
    pre: [] as Function[],
    post: [] as Function[],
  }
  let scheduler: Scheduler

  const timeRemaining = () => frameDeadline - window.performance.now()
  const deadline = {
    didTimeout: false,
    timeRemaining,
  }
  const channel = new MessageChannel()
  channel.port2.onmessage = () => {
    if (typeof pendingCallback === "function") {
      pendingCallback(deadline)
    }
  }

  function clear() {
    nextUnitOfWork = null
    treesInProgress = []
    currentTreeIndex = 0
    nextIdleEffects = []
    deletions = []
    effectCallbacks = { pre: [], post: [] }
    frameDeadline = 0
    pendingCallback = null
    sleep()
  }

  function wake() {
    if (isRunning) return
    isRunning = true
    requestIdleCallback(workLoop)
  }

  function sleep() {
    isRunning = false
    if (frameHandle !== null) {
      globalThis.cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
  }

  function nextIdle(fn: (scheduler: Scheduler) => void, wakeUpIfIdle = true) {
    nextIdleEffects.push(fn)
    if (wakeUpIfIdle) wake()
  }

  function flushSync() {
    if (frameHandle !== null) {
      globalThis.cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
    workLoop()
  }

  function queueUpdate(vNode: VNode) {
    // In immediate effect mode (useLayoutEffect), immediately mark the render as dirty
    if (isImmediateEffectsMode) {
      immediateEffectDirtiedRender = true
    }

    // If this node is currently being rendered, just mark it dirty
    if (node.current === vNode) {
      if (__DEV__) {
        window.__kiru?.profilingContext?.emit("updateDirtied", appCtx)
      }
      isRenderDirtied = true
      return
    }

    // If it's already the next unit of work, no need to queue again
    if (nextUnitOfWork === vNode) {
      return
    }

    if (nextUnitOfWork === null) {
      treesInProgress.push(vNode)
      nextUnitOfWork = vNode
      return wake()
    }

    // Check if the node is already in the treesInProgress queue
    const treeIdx = treesInProgress.indexOf(vNode)
    if (treeIdx !== -1) {
      if (treeIdx === currentTreeIndex) {
        // Replace current node if it's being worked on now
        treesInProgress[treeIdx] = vNode
        nextUnitOfWork = vNode
      } else if (treeIdx < currentTreeIndex) {
        // It was already processed; requeue it to the end
        currentTreeIndex--
        treesInProgress.splice(treeIdx, 1)
        treesInProgress.push(vNode)
      }
      return
    }

    const nodeDepth = vNode.depth

    // Check if this node is a descendant of any trees already queued
    for (let i = 0; i < treesInProgress.length; i++) {
      const tree = treesInProgress[i]
      if (tree.depth > nodeDepth) continue // Can't be an ancestor
      if (!vNodeContains(tree, vNode)) continue

      if (i === currentTreeIndex) {
        // It's a child of the currently worked-on tree
        // If it's deeper within the same tree, we can skip
        if (vNodeContains(nextUnitOfWork, vNode)) return
        // If it's not in the current work subtree, move back up to it
        nextUnitOfWork = vNode
      } else if (i < currentTreeIndex) {
        // It's a descendant of an already processed tree; treat as a new update
        treesInProgress.push(vNode)
      }

      return
    }

    // Check if this node contains any of the currently queued trees
    let didReplaceTree = false
    let shouldQueueAtEnd = false
    for (let i = 0; i < treesInProgress.length; ) {
      const tree = treesInProgress[i]
      if (tree.depth < nodeDepth || !vNodeContains(vNode, tree)) {
        i++
        continue
      }
      // This node contains another update root, replace it

      if (i === currentTreeIndex) {
        if (!didReplaceTree) {
          treesInProgress.splice(i, 1, vNode)
          nextUnitOfWork = vNode
          didReplaceTree = true
          i++ // advance past replaced node
        } else {
          treesInProgress.splice(i, 1)
          // no increment
        }
      } else if (i < currentTreeIndex) {
        currentTreeIndex--
        treesInProgress.splice(i, 1)
        if (!didReplaceTree) {
          shouldQueueAtEnd = true
          didReplaceTree = true
        }
        // no increment
      } else {
        // i > currentTreeIndex
        treesInProgress.splice(i, 1)
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
    treesInProgress.push(vNode)
  }

  function queueDelete(vNode: VNode) {
    traverseApply(vNode, (n) => (n.flags = flags.set(n.flags, FLAG.DELETION)))
    deletions.push(vNode)
  }

  function isFlushReady() {
    return !nextUnitOfWork && (deletions.length || treesInProgress.length)
  }

  function workLoop(deadline?: IdleDeadline): void {
    if (__DEV__) {
      window.__kiru?.profilingContext?.beginTick(appCtx)
    }
    ctx.current = appCtx
    while (nextUnitOfWork) {
      nextUnitOfWork =
        performUnitOfWork(nextUnitOfWork) ??
        treesInProgress[++currentTreeIndex] ??
        queueBlockedContextDependencyRoots()

      if ((deadline?.timeRemaining() ?? 1) < 1) break
    }

    if (isFlushReady()) {
      while (deletions.length) {
        commitWork(deletions.shift()!)
      }
      const treesInProgressCopy = [...treesInProgress]
      treesInProgress = []
      currentTreeIndex = 0
      for (const tree of treesInProgressCopy) {
        commitWork(tree)
      }

      isImmediateEffectsMode = true
      flushEffects(effectCallbacks.pre)
      isImmediateEffectsMode = false

      if (immediateEffectDirtiedRender) {
        checkForTooManyConsecutiveDirtyRenders()
        flushEffects(effectCallbacks.post)
        immediateEffectDirtiedRender = false
        consecutiveDirtyCount++
        if (__DEV__) {
          window.__kiru?.profilingContext?.endTick(appCtx)
          window.__kiru?.profilingContext?.emit("updateDirtied", appCtx)
        }
        return workLoop()
      }
      consecutiveDirtyCount = 0

      flushEffects(effectCallbacks.post)
      window.__kiru!.emit("update", appCtx)
      if (__DEV__) {
        window.__kiru?.profilingContext?.emit("update", appCtx)
      }
    }

    if (!nextUnitOfWork) {
      sleep()
      while (nextIdleEffects.length) {
        nextIdleEffects.shift()!(scheduler)
      }
      if (__DEV__) {
        window.__kiru?.profilingContext?.endTick(appCtx)
      }
      return
    }

    requestIdleCallback(workLoop)
  }

  function requestIdleCallback(callback: IdleRequestCallback) {
    frameHandle = globalThis.requestAnimationFrame((time) => {
      frameDeadline = time + maxFrameMs
      pendingCallback = callback
      channel.port1.postMessage(null)
    })
  }

  function queueBlockedContextDependencyRoots(): VNode | null {
    if (pendingContextChanges.size === 0) return null

    // TODO: it's possible that a 'job' created by this process is
    // blocked by a parent memo after a queueUpdate -> replaceTree action.
    // To prevent this, we might need to add these to a distinct queue.
    const jobRoots: VNode[] = []
    pendingContextChanges.forEach((provider) => {
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

    pendingContextChanges.clear()
    treesInProgress.push(...jobRoots)
    return jobRoots[0] ?? null
  }

  function performUnitOfWork(vNode: VNode): VNode | void {
    let renderChild = true
    try {
      const { props } = vNode
      if (typeof vNode.type === "string") {
        updateHostComponent(vNode as DomVNode)
      } else if (isExoticType(vNode.type)) {
        if (vNode.type === $CONTEXT_PROVIDER) {
          const asProvider = vNode as ContextProviderNode<any>
          const { dependents, value } = asProvider.props
          if (
            dependents.size &&
            asProvider.prev &&
            asProvider.prev.props.value !== value
          ) {
            pendingContextChanges.add(asProvider)
          }
        }
        vNode.child = reconcileChildren(vNode, props.children)
        vNode.deletions?.forEach((d) => queueDelete(d))
      } else {
        renderChild = updateFunctionComponent(vNode as FunctionVNode)
      }
    } catch (error) {
      window.__kiru?.emit(
        "error",
        appCtx,
        error instanceof Error ? error : new Error(String(error))
      )
      if (KiruError.isKiruError(error)) {
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
        effectCallbacks.pre.push(...nextNode.immediateEffects)
        nextNode.immediateEffects = undefined
      }
      if (nextNode.effects) {
        effectCallbacks.post.push(...nextNode.effects)
        nextNode.effects = undefined
      }
      if (nextNode === treesInProgress[currentTreeIndex]) return
      if (nextNode.sibling) {
        return nextNode.sibling
      }

      nextNode = nextNode.parent
      if (renderMode.current === "hydrate" && nextNode?.dom) {
        hydrationStack.pop()
      }
    }
  }

  function updateFunctionComponent(vNode: FunctionVNode) {
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
      nodeToCtxMap.set(vNode, appCtx)
      let newChild
      let renderTryCount = 0
      do {
        isRenderDirtied = false
        hookIndex.current = 0

        /**
         * remove previous signal subscriptions (if any) every render.
         * this prevents no-longer-observed signals from triggering updates
         * in components that are not currently using them.
         *
         * TODO: in future, we might be able to optimize this by
         * only clearing the subscriptions that are no longer needed
         * and not clearing the entire set.
         */
        if (subs) {
          for (const sub of subs) {
            Signal.unsubscribe(vNode, sub)
          }
          subs.clear()
        }

        if (__DEV__) {
          newChild = latest(type)(props)
          delete vNode.hmrUpdated
          if (++renderTryCount > CONSECUTIVE_DIRTY_LIMIT) {
            throw new KiruError({
              message:
                "Too many re-renders. Kiru limits the number of renders to prevent an infinite loop.",
              fatal: true,
              vNode,
            })
          }
          continue
        }
        newChild = type(props)
      } while (isRenderDirtied)
      vNode.child = reconcileChildren(vNode, newChild)
      vNode.deletions?.forEach((d) => queueDelete(d))
      return true
    } finally {
      node.current = null
    }
  }

  function updateHostComponent(vNode: DomVNode) {
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
        vNode.dom.__kiruNode = vNode
      }
    }
    // text should _never_ have children
    if (vNode.type !== "#text") {
      vNode.child = reconcileChildren(vNode, props.children)
      vNode.deletions?.forEach((d) => queueDelete(d))
    }

    if (vNode.child && renderMode.current === "hydrate") {
      hydrationStack.push(vNode.dom!)
    }
  }

  function checkForTooManyConsecutiveDirtyRenders() {
    if (consecutiveDirtyCount > CONSECUTIVE_DIRTY_LIMIT) {
      throw new KiruError(
        "Maximum update depth exceeded. This can happen when a component repeatedly calls setState during render or in useLayoutEffect. Kiru limits the number of nested updates to prevent infinite loops."
      )
    }
  }

  function flushEffects(effectArr: Function[]) {
    while (effectArr.length) effectArr.shift()!()
  }

  return (scheduler = {
    clear,
    wake,
    sleep,
    nextIdle,
    flushSync,
    queueUpdate,
    queueDelete,
  })
}
