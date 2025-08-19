import type {
  ContextProviderNode,
  DomVNode,
  FunctionVNode,
} from "./types.utils"
import {
  $CONTEXT_PROVIDER,
  CONSECUTIVE_DIRTY_LIMIT,
  FLAG_DELETION,
} from "./constants.js"
import { commitDeletion, commitWork, createDom, hydrateDom } from "./dom.js"
import { __DEV__ } from "./env.js"
import { KiruError } from "./error.js"
import { hookIndex, node, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { assertValidElementProps } from "./props.js"
import { reconcileChildren } from "./reconciler.js"
import {
  willMemoBlockUpdate,
  latest,
  traverseApply,
  vNodeContains,
  isExoticType,
  getVNodeAppContext,
} from "./utils.js"
import type { AppContext } from "./appContext"

type VNode = Kiru.VNode

let appCtx: AppContext | null
let nextUnitOfWork: VNode | null = null
let treesInProgress: VNode[] = []
let currentTreeIndex = 0
let isRunning = false
let nextIdleEffects: (() => void)[] = []
let deletions: VNode[] = []
let isImmediateEffectsMode = false
let immediateEffectDirtiedRender = false
let isRenderDirtied = false
let consecutiveDirtyCount = 0
let pendingContextChanges = new Set<ContextProviderNode<any>>()
let preEffects: Array<Function> = []
let postEffects: Array<Function> = []

/**
 * Runs a function after any existing work has been completed, or if the scheduler is already idle.
 */
export function nextIdle(fn: () => void, wakeUpIfIdle = true) {
  nextIdleEffects.push(fn)
  if (wakeUpIfIdle) wake()
}

/**
 * Syncronously flushes any pending work.
 */
export function flushSync() {
  workLoop()
}

/**
 * Queues a node for an update. Has no effect if the node is already deleted or marked for deletion.
 */
export function requestUpdate(vNode: VNode): void {
  if (vNode.flags & FLAG_DELETION) return
  if (renderMode.current === "hydrate") {
    return nextIdle(() => {
      vNode.flags & FLAG_DELETION || queueUpdate(vNode)
    }, false)
  }
  queueUpdate(vNode)
}

export function requestDelete(vNode: VNode): void {
  if (vNode.flags & FLAG_DELETION) return
  if (renderMode.current === "hydrate") {
    return nextIdle(() => {
      vNode.flags & FLAG_DELETION || queueDelete(vNode)
    }, false)
  }
  queueDelete(vNode)
}

function queueWorkLoop() {
  queueMicrotask(workLoop)
}

function wake() {
  if (isRunning) return
  isRunning = true
  queueWorkLoop()
}

function sleep() {
  isRunning = false
}

function queueUpdate(vNode: VNode) {
  // In immediate effect mode (useLayoutEffect), immediately mark the render as dirty
  if (isImmediateEffectsMode) {
    immediateEffectDirtiedRender = true
  }

  // If this node is currently being rendered, just mark it dirty
  if (node.current === vNode) {
    if (__DEV__) {
      window.__kiru?.profilingContext?.emit("updateDirtied", appCtx!)
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

  for (let i = 0; i < treesInProgress.length; i++) {
    const tree = treesInProgress[i]
    if (tree !== vNode) continue
    if (i < currentTreeIndex) {
      // It was already processed; requeue it to the end
      currentTreeIndex--
      treesInProgress.splice(i, 1)
      treesInProgress.push(tree)
    }
    return
  }

  // Check if this node is a descendant of any trees already queued
  for (let i = 0; i < treesInProgress.length; i++) {
    const tree = treesInProgress[i]
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
    if (!vNodeContains(vNode, tree)) {
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
  traverseApply(vNode, (n) => (n.flags |= FLAG_DELETION))
  deletions.push(vNode)
}

function workLoop(): void {
  if (__DEV__) {
    const n = nextUnitOfWork ?? deletions[0] ?? treesInProgress[0]
    if (n) {
      appCtx = getVNodeAppContext(n)!
      window.__kiru?.profilingContext?.beginTick(appCtx)
    } else {
      appCtx = null
    }
  }

  while (nextUnitOfWork) {
    nextUnitOfWork =
      performUnitOfWork(nextUnitOfWork) ??
      treesInProgress[++currentTreeIndex] ??
      queueBlockedContextDependencyRoots()
  }

  if (!nextUnitOfWork && (deletions.length || treesInProgress.length)) {
    while (deletions.length) {
      commitDeletion(deletions.shift()!)
    }
    const workRoots = [...treesInProgress]
    treesInProgress.length = 0
    currentTreeIndex = 0
    for (const root of workRoots) {
      commitWork(root)
    }

    isImmediateEffectsMode = true
    flushEffects(preEffects)
    isImmediateEffectsMode = false

    if (immediateEffectDirtiedRender) {
      checkForTooManyConsecutiveDirtyRenders()
      flushEffects(postEffects)
      immediateEffectDirtiedRender = false
      consecutiveDirtyCount++
      if (__DEV__) {
        window.__kiru?.profilingContext?.endTick(appCtx!)
        window.__kiru?.profilingContext?.emit("updateDirtied", appCtx!)
      }
      return flushSync()
    }
    consecutiveDirtyCount = 0

    flushEffects(postEffects)
    if (__DEV__) {
      window.__kiru!.emit("update", appCtx!)
      window.__kiru?.profilingContext?.emit("update", appCtx!)
    }
  }

  if (!nextUnitOfWork) {
    sleep()
    while (nextIdleEffects.length) {
      nextIdleEffects.shift()!()
    }
    if (__DEV__) {
      if (appCtx) {
        window.__kiru?.profilingContext?.endTick(appCtx)
      }
    }
    return
  }

  queueWorkLoop()
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
      for (let i = 0; i < jobRoots.length; i++) {
        const root = jobRoots[i]
        if (vNodeContains(root, dep)) {
          if (willMemoBlockUpdate(root, dep)) {
            // root is a parent of dep and there's a memo between them, prevent consolidation and queue as new root
            break
          }
          return
        }
        if (vNodeContains(dep, root)) {
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
      queueNodeChildDeletions(vNode)
    } else {
      renderChild = updateFunctionComponent(vNode as FunctionVNode)
    }
  } catch (error) {
    if (__DEV__) {
      window.__kiru?.emit(
        "error",
        appCtx!,
        error instanceof Error ? error : new Error(String(error))
      )
    }

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
      preEffects.push(...nextNode.immediateEffects)
      nextNode.immediateEffects = undefined
    }
    if (nextNode.effects) {
      postEffects.push(...nextNode.effects)
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
        subs.forEach((unsub) => unsub())
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
    queueNodeChildDeletions(vNode)
    return true
  } finally {
    node.current = null
  }
}

function updateHostComponent(vNode: DomVNode) {
  const { props, type } = vNode
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
      if (vNode.dom instanceof Element) {
        vNode.dom.__kiruNode = vNode
      }
    }
  }
  // text should _never_ have children
  if (type !== "#text") {
    vNode.child = reconcileChildren(vNode, props.children)
    queueNodeChildDeletions(vNode)
    if (vNode.child && renderMode.current === "hydrate") {
      hydrationStack.push(vNode.dom!)
    }
  }
}

function queueNodeChildDeletions(vNode: VNode) {
  if (vNode.deletions) {
    vNode.deletions.forEach(queueDelete)
    vNode.deletions = null
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
  for (let i = 0; i < effectArr.length; i++) {
    effectArr[i]()
  }
  effectArr.length = 0
}
