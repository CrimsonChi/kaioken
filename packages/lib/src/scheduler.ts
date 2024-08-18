import type { AppContext } from "./appContext"
import { Component, ComponentConstructor } from "./component.js"
import { EffectTag, elementTypes as et } from "./constants.js"
import { commitWork, createDom, hydrateDom, updateDom } from "./dom.js"
import { ctx, node, renderMode } from "./globals.js"
import { hydrationStack } from "./hydration.js"
import { assertValidElementProps } from "./props.js"
import { reconcileChildren } from "./reconciler.js"
import { applyRecursive, vNodeContains } from "./utils.js"

type VNode = Kaioken.VNode

function fireEffects(tree: VNode, immediate?: boolean) {
  const root = tree
  // traverse tree in a depth first manner
  // fire effects from the child to the root
  const rootChild = root.child
  if (!rootChild) {
    const arr = immediate ? tree.immediateEffects : tree.effects
    while (arr?.length) arr.shift()!()
    return
  }

  let branch = root.child!
  while (branch) {
    let c = branch
    while (c) {
      if (!c.child) break
      c = c.child
    }
    inner: while (c && c !== root) {
      const arr = immediate ? c.immediateEffects : c.effects
      while (arr?.length) arr.shift()!()
      if (c.sibling) {
        branch = c.sibling
        break inner
      }
      c = c.parent!
    }
    if (c === root) break
  }

  const arr = immediate ? root.immediateEffects : root.effects
  while (arr?.length) arr.shift()!()
}

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
  private isPreFlush = false
  private isRenderDirtied = false

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
  }

  wake() {
    if (this.isRunning) return
    this.isRunning = true
    this.requestIdleCallback(this.workLoop.bind(this))
  }

  sleep() {
    if (!this.isRunning) return
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
    if (this.isPreFlush) {
      this.isRenderDirtied = true
      applyRecursive(vNode, (n) => {
        n.prev = { ...n, props: { ...n.props }, prev: undefined }
      })
      return
    }

    if (this.nextUnitOfWork === vNode) {
      return
    }

    if (
      this.nextUnitOfWork === undefined &&
      this.treesInProgress.length === 0
    ) {
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

    // handle node as child or parent of queued trees
    for (let i = 0; i < this.treesInProgress.length; i++) {
      if (vNodeContains(this.treesInProgress[i], vNode)) {
        if (!this.nextUnitOfWork) {
          this.nextUnitOfWork = vNode
          this.currentTreeIndex = i
          return
        }
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
      } else if (vNodeContains(vNode, this.treesInProgress[i])) {
        if (i === this.currentTreeIndex) {
          // node contains current tree, replace it
          this.treesInProgress.splice(i, 1, vNode)
          this.nextUnitOfWork = vNode
        } else if (i < this.currentTreeIndex) {
          // node contains a tree that has already been processed
          this.currentTreeIndex--
          this.treesInProgress.splice(i, 1)
          this.treesInProgress.push(vNode)
        } else {
          // node contains a tree that has not yet been processed, 'usurp' the tree
          this.treesInProgress.splice(i, 1, vNode)
        }
        return
      }
    }
    // node is not a child or parent of any queued trees, queue new tree
    this.treesInProgress.push(vNode)
  }

  queueDelete(vNode: VNode) {
    if (this.isPreFlush) return
    applyRecursive(
      vNode,
      (n) => {
        n.effectTag = EffectTag.DELETION
      },
      false
    )
    if (vNode.props.ref) {
      vNode.props.ref.current = null
    }
    this.deletions.push(vNode)
  }

  queueEffect(vNode: VNode, effect: Function) {
    if (this.isPreFlush) return
    ;(vNode.effects ??= []).push(effect)
  }

  queueImmediateEffect(vNode: VNode, effect: Function) {
    if (this.isPreFlush) return
    ;(vNode.immediateEffects ??= []).push(effect)
  }

  private isFlushReady() {
    return (
      !this.nextUnitOfWork &&
      (this.deletions.length || this.treesInProgress.length)
    )
  }

  private workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    ctx.current = this.appCtx
    while (this.nextUnitOfWork && !shouldYield) {
      this.nextUnitOfWork =
        this.performUnitOfWork(this.nextUnitOfWork) ??
        this.treesInProgress[++this.currentTreeIndex]

      shouldYield =
        (deadline && deadline.timeRemaining() < 1) ??
        (!deadline && !this.nextUnitOfWork)
    }

    flush: if (this.isFlushReady()) {
      this.isPreFlush = true
      for (const t of this.treesInProgress) {
        fireEffects(t, true)
      }
      this.isPreFlush = false
      if (this.isRenderDirtied) {
        this.isRenderDirtied = false
        for (const t of this.treesInProgress) {
          fireEffects(t)
        }
        break flush
      }

      this.doCommit()
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

  private doCommit() {
    while (this.deletions.length) {
      commitWork(this.deletions.shift()!)
    }
    if (this.treesInProgress.length) {
      this.currentTreeIndex = 0
      const tip = [...this.treesInProgress]
      this.treesInProgress = []
      while (tip.length) {
        const t = tip.shift()!
        commitWork(t)
        fireEffects(t)
      }
    }
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
    const skip = frozen && vNode.effectTag !== EffectTag.PLACEMENT
    if (!skip) {
      try {
        if (Component.isCtor(vNode.type)) {
          this.updateClassComponent(vNode)
        } else if (vNode.type instanceof Function) {
          this.updateFunctionComponent(vNode)
        } else if (vNode.type === et.fragment) {
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
        console.error(error)
        window.__kaioken?.emit(
          "error",
          this.appCtx,
          error instanceof Error ? error : new Error(String(error))
        )
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

  private updateClassComponent(vNode: VNode) {
    node.current = vNode
    const type = vNode.type as ComponentConstructor
    if (!vNode.instance) {
      const instance = vNode.prev?.instance ?? new type(vNode.props)
      vNode.instance = instance
    } else {
      vNode.instance.props = vNode.props
    }

    vNode.child =
      reconcileChildren(
        this.appCtx,
        vNode,
        vNode.child || null,
        vNode.instance.render()
      ) || undefined

    if (!vNode.prev) {
      const onMounted = vNode.instance.componentDidMount?.bind(vNode.instance)
      if (onMounted) this.appCtx.queueEffect(vNode, onMounted)
    } else {
      const onUpdated = vNode.instance.componentDidUpdate?.bind(vNode.instance)
      if (onUpdated) this.appCtx.queueEffect(vNode, onUpdated)
    }

    node.current = undefined
  }

  private updateFunctionComponent(vNode: VNode) {
    this.appCtx.hookIndex = 0
    node.current = vNode
    const children = (vNode.type as Function)(vNode.props)
    vNode.child =
      reconcileChildren(this.appCtx, vNode, vNode.child || null, children) ||
      undefined
    node.current = undefined
  }

  private updateHostComponent(vNode: VNode) {
    assertValidElementProps(vNode)
    if (!vNode.dom) {
      if (renderMode.current === "hydrate") {
        hydrateDom(vNode)
      } else {
        vNode.dom = createDom(vNode)
        updateDom(vNode)
      }
    }
    if (vNode.props.ref) {
      vNode.props.ref.current = vNode.dom
    }
    vNode.child =
      reconcileChildren(
        this.appCtx,
        vNode,
        vNode.child || null,
        vNode.props.children
      ) || undefined
  }
}
