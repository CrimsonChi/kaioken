import { AppContext } from "kaioken"
import { useDevtoolsStore } from "./store"

export function App() {
  return (
    <>
      <header></header>
      <main>
        <div className="flex flex-col gap-2">
          <AppSelector />
        </div>
      </main>
    </>
  )
}

function AppSelector() {
  const {
    value: { apps, selectedApp },
    setSelectedApp,
  } = useDevtoolsStore(({ apps, selectedApp }) => ({ apps, selectedApp }))
  return (
    <div className="p-2">
      <h2 className="font-bold">App Selector</h2>
      <ul>
        {apps.map((app) => (
          <li
            className={`flex ${app === selectedApp ? "font-bold bg-primary" : ""}`}
          >
            <button onclick={() => setSelectedApp(app)}>{app.name}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// function AppView() {
//   const { value: app } = useDevtoolsStore((state) => state.selectedApp)

//   const node = getCurrentNode()
//   const ctx = getNodeAppContext(node!)

//   function handleUpdate(appCtx: __devtoolsAppContext) {
//     if (appCtx !== app || !node) return
//     ctx?.requestUpdate(node)
//   }
//   __devtoolsUseEffect(() => {
//     __devtoolsGlobalCtx.on("update", handleUpdate)
//     return () => __devtoolsGlobalCtx.off("update", handleUpdate)
//   }, [])

//   return (
//     <div style="flex-grow:1;padding:.5rem;max-height:500px;overflow-y:auto">
//       <h2 style="font-weight:bold">App View</h2>
//       <__DevtoolsNodeListItem node={app?.rootNode} />
//     </div>
//   )
// }

// function __DevtoolsNodeListItem({
//   node,
//   traverseSiblings = true,
// }: {
//   node?: Kaioken.VNode
//   traverseSiblings?: boolean
// }) {
//   const { value: selectedNode, setSelectedNode } = __useDevtoolsStore(
//     (state) => state.selectedNode,
//     (prev, next) => {
//       return prev === node || next === node
//     }
//   )
//   const [collapsed, setCollapsed] = __devtoolsUseState(true)

//   if (!node) return null
//   if (typeof node.type !== "function" || node.type === __devtoolsFragment)
//     return (
//       <>
//         <__DevtoolsNodeListItem node={node.child} />
//         {traverseSiblings && <__DevtoolsNodeListItemSiblings node={node} />}
//       </>
//     )

//   return (
//     <>
//       <div style="padding-left:.5rem">
//         <h2
//           onclick={() =>
//             setSelectedNode(selectedNode === node ? null : (node as any))
//           }
//           style={
//             "display:flex;gap:.5rem;align-items:center;cursor:pointer;" +
//             (selectedNode === node ? activeItemStyle : "")
//           }
//         >
//           <__devtoolsChevron
//             style={{
//               transition: "transform .3s",
//               transform: "rotate(" + (collapsed ? 0 : 90) + "deg)",
//               cursor: "pointer",
//             }}
//             onclick={(e) => {
//               e.preventDefault()
//               e.stopImmediatePropagation()
//               setCollapsed((prev) => !prev)
//             }}
//           />
//           {"<" + __getNodeName(node) + ">"}
//         </h2>
//         {collapsed ? null : <__DevtoolsNodeListItem node={node.child} />}
//       </div>
//       {traverseSiblings && <__DevtoolsNodeListItemSiblings node={node} />}
//     </>
//   )
// }
// function __DevtoolsNodeListItemSiblings({ node }: { node?: Kaioken.VNode }) {
//   if (!node) return null
//   let nodes = []
//   let n: Kaioken.VNode | undefined = node.sibling
//   while (n) {
//     nodes.push(n)
//     n = n.sibling
//   }
//   return __devtoolsFragment({
//     children: nodes.map((n) => (
//       <__DevtoolsNodeListItem node={n} traverseSiblings={false} />
//     )),
//   })
// }

function __getAppName(app: AppContext) {
  return __getNodeName(app.rootNode!.child!)
}

function __getNodeName(node: Kaioken.VNode) {
  return (
    (node.type as any).displayName ??
    ((node.type as Function).name || "Anonymous Function")
  )
}
