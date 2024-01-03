// https://pomb.us/build-your-own-react/
// https://www.youtube.com/watch?v=YfnPk3nzWts
import type { VNode, Rec, Ref, Context, ProviderProps } from "./types"

export {
  mount,
  createElement,
  fragment,
  useEffect,
  useState,
  useRef,
  useReducer,
  useContext,
  createContext,
  createPortal,
  globalState,
  setWipNode,
}

let mounted = false
let nextUnitOfWork: VNode | undefined = undefined
let currentRoot: VNode | undefined = undefined
let wipRoot: VNode | undefined = undefined
let deletions: VNode[] = []
let pendingEffects: Function[] = []

let wipNode: VNode | null = null
let hookIndex: number = -1

function mount(appFunc: () => VNode, container: HTMLElement) {
  const app = appFunc()
  app.type = appFunc
  wipRoot = {
    dom: container,
    props: {
      children: [app],
    },
    alternate: currentRoot,
    hooks: [],
  }
  deletions = []
  nextUnitOfWork = wipRoot
  mounted = true
}

function setWipNode(vNode: VNode) {
  wipNode = vNode
  hookIndex = 0
}

//#region hooks
function useState<T>(
  initial: T
): [T, (action: T | ((oldVal: T) => T)) => void] {
  // @ts-ignore
  if (!mounted) return []
  if (!wipNode) {
    console.error("no wipNode")
    // @ts-ignore
    return
  }
  const wn = wipNode

  const oldHook =
    wipNode.alternate &&
    wipNode.alternate.hooks &&
    wipNode.alternate.hooks[hookIndex]

  const hook = oldHook ?? { state: initial }

  const setState = (action: T | ((oldVal: T) => T)) => {
    if (!currentRoot) throw new Error("currentRoot is undefined, why???")
    hook.state =
      typeof action === "function" ? (action as Function)(hook.state) : action

    wipRoot = {
      dom: wn.child!.dom,
      props: wn.props,
      alternate: wn,
      hooks: [],
      type: wn.type,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipNode.hooks.push(hook)
  hookIndex++
  return [hook.state, setState] as const
}
function useEffect(callback: Function, deps: any[] = []) {
  if (!mounted) return
  if (!wipNode) {
    console.error("no wipNode")
    return
  }

  const oldHook =
    wipNode.alternate &&
    wipNode.alternate.hooks &&
    wipNode.alternate.hooks[hookIndex]

  if (oldHook?.cleanup) {
    oldHook.cleanup()
  }

  const hasChangedDeps =
    !oldHook ||
    deps.length === 0 ||
    (oldHook && !deps.every((dep, i) => dep === oldHook.deps[i]))

  const hook = {
    deps,
    callback,
    cleanup: undefined,
  }

  if (hasChangedDeps) {
    pendingEffects.push(() => {
      const cleanup = callback()
      if (cleanup && typeof cleanup === "function") {
        hook.cleanup = cleanup
      }
    })
  }

  wipNode.hooks.push(hook)
  hookIndex++
}

const refHelpers = {
  isRef: (v: any): v is Ref<any> => v && v.current !== undefined,
  setRef: (vNode: VNode, dom: HTMLElement | Text | null) => {
    if (refHelpers.isRef(vNode.props.ref)) vNode.props.ref.current = dom
  },
}
function useRef<T>(initial: T | null): Ref<T> {
  if (!mounted) return { current: initial }
  if (!wipNode) {
    console.error("no wipNode")
    return { current: initial }
  }

  const oldHook =
    wipNode.alternate &&
    wipNode.alternate.hooks &&
    wipNode.alternate.hooks[hookIndex]

  const hook = oldHook ?? { current: initial }

  wipNode.hooks.push(hook)
  hookIndex++
  return hook as Ref<T>
}

function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  initial: T
): [T, (action: A) => void] {
  if (!mounted) return [initial, () => initial]
  if (!wipNode) {
    console.error("no wipNode")
    return [initial, () => initial]
  }

  const wn = wipNode

  const oldHook =
    wipNode.alternate &&
    wipNode.alternate.hooks &&
    wipNode.alternate.hooks[hookIndex]

  const hook = oldHook ?? { state: initial }

  const dispatch = (action: A) => {
    if (!currentRoot) throw new Error("currentRoot is undefined, why???")
    hook.state = reducer(hook.state, action)

    wipRoot = {
      dom: wn.child!.dom,
      props: wn.props,
      alternate: wn,
      hooks: [],
      type: wn.type,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipNode.hooks.push(hook)
  hookIndex++
  return [hook.state, dispatch]
}

function useContext<T>(context: Context<T>): T {
  if (!mounted) return {} as T
  if (!wipNode) {
    throw new Error("no wipNode")
  }

  const oldHook =
    wipNode.alternate &&
    wipNode.alternate.hooks &&
    wipNode.alternate.hooks[hookIndex]

  const hook = oldHook ?? { state: context.value() }

  wipNode.hooks.push(hook)
  hookIndex++
  return hook.state as T
}

//#endregion

function createContext<T>(initial: T | null): Context<T> {
  let context = initial

  return {
    Provider: ({ value, children = [] }: ProviderProps<T>) => {
      context = value
      return fragment({ children })
    },
    value: () => context as T,
  }
}

function createPortal(
  element: JSX.Element,
  container: HTMLElement | Text
): JSX.Element | undefined {
  const el = element as VNode

  return {
    type: container.nodeName,
    props: {
      children: [el],
    },
    dom: container,
    hooks: [],
    parent: undefined,
  }
}
function fragment({
  children = [],
}: {
  children: (VNode | unknown)[]
}): JSX.Element {
  return {
    type: "x-fragment",
    props: {
      children: children
        .flat()
        .map((child) =>
          typeof child === "object" ? child : createTextElement(String(child))
        ) as VNode[],
    },
    hooks: [],
  }
}
function createElement(
  type: string | Function,
  props = {},
  ...children: (VNode | unknown)[]
): VNode {
  return {
    type,
    props: {
      ...props,
      children: children
        .flat()
        .map((child) =>
          typeof child === "object" ? child : createTextElement(String(child))
        ) as VNode[],
    },
    hooks: [],
  }
}
function createTextElement(text: string): VNode {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
    hooks: [],
  }
}

const filters = {
  internalProps: ["children", "ref"],
  isEvent: (key: string) => key.startsWith("on"),
  isProperty: (key: string) =>
    !filters.internalProps.includes(key) && !filters.isEvent(key),
  isNew: (prev: Rec, next: Rec) => (key: string) => prev[key] !== next[key],
  isGone: (_prev: Rec, next: Rec) => (key: string) => !(key in next),
}

function createDom(vNode: VNode): HTMLElement | Text {
  const dom =
    vNode.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(vNode.type as string)

  updateDom(dom, {}, vNode.props, vNode)

  return dom
}

function updateDom(
  dom: HTMLElement | Text,
  prevProps: Rec,
  nextProps: Rec = {},
  vNode: VNode
) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(filters.isEvent)
    .filter(
      (key) => !(key in nextProps) || filters.isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(filters.isProperty)
    .filter(filters.isGone(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(filters.isProperty)
    .filter(filters.isNew(prevProps, nextProps))
    .forEach((name) => {
      // @ts-ignore
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(filters.isEvent)
    .filter(filters.isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  refHelpers.setRef(vNode, dom)
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot?.child)
  currentRoot = wipRoot
  while (pendingEffects.length) pendingEffects.shift()?.()
  wipRoot = undefined
}

function commitWork(vNode?: VNode) {
  if (!vNode) {
    return
  }

  let domParentNode = vNode.parent ?? vNode.alternate?.parent ?? wipRoot
  let domParent = domParentNode?.dom
  while (domParentNode && !domParent) {
    domParentNode = domParentNode.parent ?? domParentNode.alternate?.parent
    domParent = domParentNode?.dom ?? domParentNode?.alternate?.dom
  }

  if (!domParent) {
    console.error("no domParent")
    return
  }

  if (vNode.effectTag === "PLACEMENT" && vNode.dom != null) {
    let sibling = vNode.parent?.sibling?.child?.dom

    if (!sibling) {
      const { idx } = getMountLocation(vNode)
      sibling = domParent.childNodes[idx > 0 ? idx : 0] as HTMLElement
    }

    if (sibling && domParent.contains(sibling)) {
      domParent.insertBefore(vNode.dom, sibling)
    } else {
      domParent.appendChild(vNode.dom)
    }

    //domParent.appendChild(vNode.dom)
  } else if (vNode.effectTag === "UPDATE" && vNode.dom != null) {
    updateDom(vNode.dom, vNode.alternate?.props ?? {}, vNode.props, vNode)
  } else if (vNode.effectTag === "DELETION") {
    commitDeletion(vNode, domParent)
    return
  }

  commitWork(vNode.child)
  commitWork(vNode.sibling)
}

function commitDeletion(vNode: VNode, domParent: HTMLElement | Text) {
  if (vNode.dom) {
    refHelpers.setRef(vNode, null)
    domParent.removeChild(vNode.dom)
  } else if (vNode.child) {
    commitDeletion(vNode.child, domParent)
  }
}

function workLoop(deadline: IdleDeadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(vNode: VNode): VNode | undefined {
  const isFunctionComponent = vNode.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(vNode)
  } else {
    updateHostComponent(vNode)
  }
  if (vNode.child) {
    return vNode.child
  }
  let nextNode: VNode | undefined = vNode
  while (nextNode) {
    if (nextNode.sibling) {
      return nextNode.sibling
    }
    nextNode = nextNode.parent
  }
  return
}

function updateFunctionComponent(vNode: VNode) {
  wipNode = vNode
  hookIndex = 0

  wipNode.hooks = []
  const children = [(vNode.type as Function)(vNode.props)]
  // for (const c of children) {
  //   if (c === null) debugger
  // }
  reconcileChildren(vNode, children)
}

function updateHostComponent(vNode: VNode) {
  if (!vNode.dom) {
    vNode.dom = createDom(vNode)
  }
  reconcileChildren(vNode, vNode.props.children)
}

function reconcileChildren(vNode: VNode, children: VNode[]) {
  let index = 0
  let oldNode: VNode | undefined = vNode.alternate && vNode.alternate.child
  let prevSibling: VNode | undefined = undefined

  while (index < children.length || oldNode != null) {
    const child = children[index]
    let newNode = undefined

    const sameType = oldNode && child && child.type == oldNode.type

    if (sameType) {
      newNode = {
        type: oldNode!.type,
        props: child.props,
        dom: oldNode!.dom,
        parent: vNode,
        alternate: oldNode,
        effectTag: "UPDATE",
        hooks: oldNode!.hooks,
      }
    }
    if (child && !sameType) {
      newNode = {
        type: child.type,
        props: child.props,
        dom: undefined,
        parent: vNode,
        alternate: undefined,
        effectTag: "PLACEMENT",
        hooks: [],
      }
    }
    if (oldNode && !sameType) {
      oldNode.effectTag = "DELETION"
      deletions.push(oldNode)
    }

    if (oldNode) {
      oldNode = oldNode.sibling
    }

    if (index === 0) {
      vNode.child = newNode
    } else if (child && prevSibling) {
      prevSibling.sibling = newNode
    }

    prevSibling = newNode
    index++
  }
}

//#region utils

function getMountLocation(
  vNode: VNode,
  start = -1
): {
  element: HTMLElement | Text | SVGSVGElement | null
  idx: number
} {
  if (!vNode.parent) return { element: null, idx: -1 }

  for (let i = 0; i < vNode.parent.props.children.length; i++) {
    const c = vNode.parent.props.children[i]
    if (vNode === c) {
      break
    }

    start += getRenderedNodeCount(c)
  }

  if (vNode.parent.dom) return { element: vNode.parent.dom, idx: start }

  return getMountLocation(vNode.parent, start)
}

function getRenderedNodeCount(vNode?: VNode): number {
  if (!vNode) return 0
  if (vNode.props.children.length === 0) return 1
  return vNode.props.children.reduce(
    (acc, c) => acc + getRenderedNodeCount(c),
    0
  )
}

function globalState() {
  return {
    mounted,
    nextUnitOfWork,
    currentRoot,
    wipRoot,
    deletions,
    pendingEffects,
    wipNode,
    hookIndex,
  }
}

//#endregion
