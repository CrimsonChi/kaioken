import {
  useState as __devtoolsUseState,
  Transition as __devtoolsTransition,
  createStore as __devtoolsCreateStore,
  fragment as __devtoolsFragment,
  type AppContext as __devtoolsAppContext,
  useEffect as __devtoolsUseEffect,
} from "kaioken"
import { __DevtoolsLogo } from "./logo"
import { __devtoolsGlobalCtx, __useDevtoolsStore } from "./store"
import { __devtoolsChevron } from "./chevron"
import { getCurrentNode, getNodeAppContext } from "kaioken/dist/utils"

const __devtoolsActiveItemStyle =
  "font-weight:bold;background-color:rgba(237,20,61,.6);color:white;"

export default function __DevtoolsApp() {
  const {
    value: { open, selectedApp, selectedNode },
  } = __useDevtoolsStore()
  return (
    <>
      <__DevtoolsToggleButton />
      <__devtoolsTransition
        in={open}
        timings={[40, 150, 150, 150]}
        element={(state) => {
          const posStyle =
            "position:fixed;left:0;bottom:0;right:0;transition:transform .3s;"
          const bgStyle = "background-color:#333;box-shadow:0 0 10px #0003;"
          let style = posStyle + bgStyle
          if (state !== "entered") style += "transform:translateY(100%);"
          else style += "transform:translateY(0);"
          return (
            <div style={style}>
              <__DevtoolsHeader />
              <div style="display:flex;gap:.5rem;padding:.5rem;">
                <__DevtoolsAppSelector />
                {selectedApp && <__DevtoolsAppView />}
                {selectedNode && <__DevtoolsSelectedNodeView />}
              </div>
            </div>
          )
        }}
      />
    </>
  )
}

function __DevtoolsSelectedNodeView() {
  const { value: app } = __useDevtoolsStore(
    (state) => state.selectedApp,
    (prev, next) => prev === next
  )
  const node = getCurrentNode()
  const ctx = getNodeAppContext(node!)

  function handleUpdate(appCtx: __devtoolsAppContext) {
    if (appCtx !== app || !node) return
    ctx?.requestUpdate(node)
  }
  __devtoolsUseEffect(() => {
    __devtoolsGlobalCtx.on("update", handleUpdate)
    return () => __devtoolsGlobalCtx.off("update", handleUpdate)
  }, [])

  const { value: selectedNode } = __useDevtoolsStore((s) => s.selectedNode)
  if (selectedNode === null) return null
  const props = { ...selectedNode.props } as Record<string, any>
  delete props.children
  return (
    <div style="flex-grow:1;padding:.5rem;max-height:500px;overflow-y:auto">
      <h2 style="font-weight:bold;border-bottom:1px solid rgba(0,0,0,.3)">
        {"<" + __getNodeName(selectedNode) + ">"}
      </h2>
      <NodeDataSection title="props">
        {JSON.stringify(props, null, 2)}
      </NodeDataSection>
      <NodeDataSection title="state">
        {selectedNode.hooks && (
          <div style="font-size:small">
            {selectedNode.hooks.map((hookData) => {
              const data = { ...hookData }
              const name = data.name
              delete data.name
              return (
                <div>
                  <b>{name || "anonymous hook"}</b>
                  <div style="padding:.5rem">
                    {Object.keys(data).map((key) => {
                      const value = data[key as keyof typeof data]
                      if (typeof value === "function") return null
                      return (
                        <div style="display:flex;gap:.5rem;margin-bottom:.5rem;">
                          <b style="padding:.5rem;">{key}:</b>{" "}
                          <pre style="background-color:#0003;padding:.5rem;">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </NodeDataSection>
    </div>
  )
}

function NodeDataSection({
  title,
  children,
}: {
  title: string
  children?: JSX.Element[]
}) {
  const [collapsed, setCollapsed] = __devtoolsUseState(true)
  return (
    <div>
      <h3
        onclick={(e) => {
          e.preventDefault()
          e.stopImmediatePropagation()
          setCollapsed((prev) => !prev)
        }}
        style="cursor:pointer;display:flex;align-items:center;gap:.5rem"
      >
        <__devtoolsChevron
          style={{
            transition: "transform .3s",
            transform: "rotate(" + (collapsed ? 0 : 90) + "deg)",
          }}
        />
        {title}
      </h3>
      {collapsed ? null : <div style="padding:.5rem">{children}</div>}
    </div>
  )
}

function __DevtoolsHeader() {
  return (
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.5rem;border-bottom:1px solid #222;box-shadow: 0 0 10px #0005;">
      <h1>Devtools Panel</h1>
      <__DevtoolsToggleButton />
    </div>
  )
}
function __DevtoolsToggleButton() {
  const { toggle } = __useDevtoolsStore()
  return (
    <button onclick={toggle}>
      <__DevtoolsLogo />
    </button>
  )
}

function __DevtoolsAppSelector() {
  const { value, setSelectedApp } = __useDevtoolsStore()
  return (
    <div style="padding:.5rem">
      <h2 style="font-weight:bold">App Selector</h2>
      <ul>
        {value.apps.map((app) => (
          <li
            style={
              "display:flex;" +
              (app === value.selectedApp ? __devtoolsActiveItemStyle : "")
            }
          >
            <button onclick={() => setSelectedApp(app)}>
              {__getAppName(app)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
function __DevtoolsAppView() {
  const { value: app } = __useDevtoolsStore((state) => state.selectedApp)

  const node = getCurrentNode()
  const ctx = getNodeAppContext(node!)

  function handleUpdate(appCtx: __devtoolsAppContext) {
    if (appCtx !== app || !node) return
    ctx?.requestUpdate(node)
  }
  __devtoolsUseEffect(() => {
    __devtoolsGlobalCtx.on("update", handleUpdate)
    return () => __devtoolsGlobalCtx.off("update", handleUpdate)
  }, [])

  return (
    <div style="flex-grow:1;padding:.5rem;max-height:500px;overflow-y:auto">
      <h2 style="font-weight:bold">App View</h2>
      <__DevtoolsNodeListItem node={app?.rootNode} />
    </div>
  )
}

function __DevtoolsNodeListItem({
  node,
  traverseSiblings = true,
}: {
  node?: Kaioken.VNode
  traverseSiblings?: boolean
}) {
  const { value: selectedNode, setSelectedNode } = __useDevtoolsStore(
    (state) => state.selectedNode,
    (prev, next) => {
      return prev === node || next === node
    }
  )
  const [collapsed, setCollapsed] = __devtoolsUseState(true)

  if (!node) return null
  if (typeof node.type !== "function" || node.type === __devtoolsFragment)
    return (
      <>
        <__DevtoolsNodeListItem node={node.child} />
        {traverseSiblings && <__DevtoolsNodeListItemSiblings node={node} />}
      </>
    )

  return (
    <>
      <div style="padding-left:.5rem">
        <h2
          onclick={() =>
            setSelectedNode(selectedNode === node ? null : (node as any))
          }
          style={
            "display:flex;gap:.5rem;align-items:center;cursor:pointer;" +
            (selectedNode === node ? __devtoolsActiveItemStyle : "")
          }
        >
          <__devtoolsChevron
            style={{
              transition: "transform .3s",
              transform: "rotate(" + (collapsed ? 0 : 90) + "deg)",
              cursor: "pointer",
            }}
            onclick={(e) => {
              e.preventDefault()
              e.stopImmediatePropagation()
              setCollapsed((prev) => !prev)
            }}
          />
          {"<" + __getNodeName(node) + ">"}
        </h2>
        {collapsed ? null : <__DevtoolsNodeListItem node={node.child} />}
      </div>
      {traverseSiblings && <__DevtoolsNodeListItemSiblings node={node} />}
    </>
  )
}
function __DevtoolsNodeListItemSiblings({ node }: { node?: Kaioken.VNode }) {
  if (!node) return null
  let nodes = []
  let n: Kaioken.VNode | undefined = node.sibling
  while (n) {
    nodes.push(n)
    n = n.sibling
  }
  return __devtoolsFragment({
    children: nodes.map((n) => (
      <__DevtoolsNodeListItem node={n} traverseSiblings={false} />
    )),
  })
}

function __getAppName(app: __devtoolsAppContext) {
  return __getNodeName(app.rootNode!.child!)
}

function __getNodeName(node: Kaioken.VNode) {
  return (
    (node.type as any).displayName ??
    ((node.type as Function).name || "Anonymous Function")
  )
}

// function __highlightElement(el: Element) {}
