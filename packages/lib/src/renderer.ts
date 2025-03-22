import { traverseApply, commitSnapshot, postOrderApply } from "./utils.js"
import { cleanupHook } from "./hooks/utils.js"
import { FLAG } from "./constants.js"
import { Signal } from "./signals/index.js"
import { renderMode } from "./globals.js"
import { __DEV__ } from "./env.js"
import { flags } from "./flags.js"
import type { DomVNode, ElementVNode, MaybeDom, SomeDom } from "./types.utils"
export type RendererNodeTypes = {
  parent: any
  child: any
}

export type Renderer<T extends RendererNodeTypes> = {
  appendChild(parent: T["parent"], element: T["child"]): void
  prependChild(parent: T["parent"], element: T["child"]): void
  onRemove(vNode: Kaioken.VNode): void
  insertAfter(parent: T["parent"], prev: T["child"], element: T["child"]): void
  isValidParent(element: T["child"]): boolean
  getMountableParent(vNode: Kaioken.VNode): Kaioken.VNode
  canInsertAfter(element: T["child"]): boolean
  shouldSearchChildrenForSibling: (vNode: Kaioken.VNode) => boolean
  elementRequiresPlacement(vNode: Kaioken.VNode): boolean
  updateElement(
    vNode: Kaioken.VNode,
    prevProps: Record<string, any>,
    nextProps: Record<string, any>
  ): void
  validateProps(vNode: Kaioken.VNode): void
  createElement(vNode: Kaioken.VNode): T["child"]
  createRoot(container: T["parent"], children: JSX.Children): Kaioken.VNode
  onRootMounted(container: T["parent"]): void
  onBeforeCommit(): void
  onAfterCommit(): void
  onCommitTraversalDescend(vNode: Kaioken.VNode): void
  onUpdateTraversalAscend(): void
}

type VNode = Kaioken.VNode
type HostNode = {
  node: ElementVNode
  lastChild?: DomVNode
}
type PlacementScope = {
  parent: VNode
  active: boolean
  child?: VNode
}

export function commitWork(renderer: Renderer<any>, vNode: VNode) {
  if (renderMode.current === "hydrate") {
    return traverseApply(vNode, commitSnapshot)
  }
  if (flags.get(vNode.flags, FLAG.DELETION)) {
    return commitDeletion(renderer, vNode)
  }
  renderer.onBeforeCommit()

  const hostNodes: HostNode[] = []
  let currentHostNode: HostNode | undefined
  const placementScopes: PlacementScope[] = []
  let currentPlacementScope: PlacementScope | undefined

  postOrderApply(vNode, {
    onDescent: (node) => {
      if (!node.child) return
      if (node.dom) {
        // collect host nodes as we go
        currentHostNode = { node: node as ElementVNode }
        hostNodes.push(currentHostNode)
        renderer.onCommitTraversalDescend(node)

        if (currentPlacementScope?.active) {
          currentPlacementScope.child = node
          // prevent scope applying to descendants of this element node
          currentPlacementScope.active = false
        }
      } else if (flags.get(node.flags, FLAG.PLACEMENT)) {
        currentPlacementScope = { parent: node, active: true }
        placementScopes.push(currentPlacementScope)
      }
    },
    onAscent: (node) => {
      // if (node.props["data-test"]) debugger
      let inheritsPlacement = false
      if (currentPlacementScope?.child === node) {
        currentPlacementScope.active = true
        inheritsPlacement = true
      }
      if (flags.get(node.flags, FLAG.DELETION)) {
        return commitDeletion(renderer, node)
      }
      if (node.dom) {
        commitDom(
          renderer,
          node as DomVNode,
          currentHostNode,
          inheritsPlacement
        )
      }
      commitSnapshot(node)
    },
    onBeforeAscent(node) {
      if (currentPlacementScope?.parent === node) {
        placementScopes.pop()
        currentPlacementScope = placementScopes[placementScopes.length - 1]
      }
      if (currentHostNode?.node === node.parent) {
        hostNodes.pop()
        currentHostNode = hostNodes[hostNodes.length - 1]
      }
    },
  })

  renderer.onAfterCommit()
}

function placeDom(
  renderer: Renderer<any>,
  vNode: VNode,
  mntParent: VNode,
  prevSiblingDom?: SomeDom
) {
  const dom = vNode.dom
  if (prevSiblingDom) {
    return renderer.insertAfter(mntParent.dom, prevSiblingDom, dom)
  }
  if (mntParent.dom?.childNodes.length === 0) {
    return renderer.appendChild(mntParent.dom, dom)
  }
  /**
   * scan from vNode, up, down, then right (repeating) to find previous dom
   */
  let prevDom: MaybeDom
  let currentParent = vNode.parent!
  let furthestParent = currentParent
  let child = currentParent.child!

  /**
   * to prevent sibling-traversal beyond the mount parent or the node
   * we're placing, we're creating a 'bounds' for our traversal.
   */
  const dBounds: VNode[] = [vNode]
  const rBounds: VNode[] = [vNode]
  let parent = vNode.parent
  while (parent && parent !== mntParent) {
    rBounds.push(parent)
    parent = parent.parent
  }

  const siblingCheckpoints: VNode[] = []
  while (child && currentParent.depth >= mntParent.depth) {
    /**
     * keep track of siblings we've passed for later,
     * as long as they're within bounds.
     */
    if (child.sibling && rBounds.indexOf(child) === -1) {
      siblingCheckpoints.push(child.sibling)
    }
    // downwards traversal
    const dom = child.dom
    if (
      renderer.shouldSearchChildrenForSibling(child) &&
      dBounds.indexOf(child) === -1
    ) {
      dBounds.push(child)
      // traverse downwards if no dom for this child
      if (!dom && child.child) {
        currentParent = child
        child = currentParent.child!
        continue
      }
      // dom found, we can continue up/right traversal
      if (renderer.canInsertAfter(dom)) {
        prevDom = dom
      }
    }

    // reverse and traverse through most recent sibling checkpoint
    if (siblingCheckpoints.length) {
      child = siblingCheckpoints.pop()!
      currentParent = child.parent!
      continue
    }

    if (prevDom) break // no need to continue traversal
    if (!furthestParent.parent) break // we've reached the root of the tree

    // continue our upwards crawl from the furthest parent
    currentParent = furthestParent.parent
    furthestParent = currentParent
    child = currentParent.child!
  }

  if (!prevDom) {
    return renderer.prependChild(mntParent.dom, dom)
  }
  renderer.insertAfter(mntParent.dom, prevDom, dom)
}

function commitDom(
  renderer: Renderer<any>,
  vNode: DomVNode,
  hostNode: HostNode | undefined,
  inheritsPlacement: boolean
) {
  if (
    inheritsPlacement ||
    renderer.elementRequiresPlacement(vNode) ||
    flags.get(vNode.flags, FLAG.PLACEMENT)
  ) {
    const parent = hostNode?.node ?? renderer.getMountableParent(vNode)
    placeDom(renderer, vNode, parent, hostNode?.lastChild?.dom)
  }
  if (!vNode.prev || flags.get(vNode.flags, FLAG.UPDATE)) {
    renderer.updateElement(vNode, vNode.prev?.props ?? {}, vNode.props)
  }
  if (hostNode) {
    hostNode.lastChild = vNode
  }
}

function commitDeletion(renderer: Renderer<any>, vNode: VNode) {
  if (vNode === vNode.parent?.child) {
    vNode.parent.child = vNode.sibling
  }
  traverseApply(vNode, (node) => {
    const { hooks, subs, cleanups } = node
    while (hooks?.length) cleanupHook(hooks.pop()!)
    while (subs?.length) Signal.unsubscribe(node, subs.pop()!)
    if (cleanups) Object.values(cleanups).forEach((c) => c())
    renderer.onRemove(node)
  })
}
