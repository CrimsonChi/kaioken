import { HydrationBoundary } from "kaioken/ssr"
import Counter from "./Counter"
import { createContext, Derive, For, useSignal } from "kaioken"
import ElementBindingsExample from "shared/src/ElementBindingsExample"
import WebComponentExample from "shared/src/WebComponentExample"
import StoreExample from "shared/src/StoreExample"

const test = {
  ThemeContext: createContext<"light" | "dark">("dark"),
}

const a = () => 123
export function Page() {
  const greeting = useSignal("Hello world!")
  const a = () => 456
  const items = useSignal([1, 2, 3])
  /**
   * todo: the 'a' function is being passed and called inside the generated component.
   * need to ensure it is called at the top level instead.
   */
  const addItem = () => (
    items.value.push(items.value.length + 1), items.notify()
  )
  return (
    <HydrationBoundary mode="lazy">
      <ElementBindingsExample />
      {/* <WebComponentExample />
      <StoreExample />

      <test.ThemeContext.Provider value="dark">
        {(value) => <div>{value}</div>}
      </test.ThemeContext.Provider>
      <div className="p-6">
        <h1>{a()}</h1>
        <h2>{greeting}</h2>
        <button onclick={addItem}>add item</button>
        <Derive from={items}>
          {(items) => (
            <div>
              {items.map((item) => (
                <div>{item}</div>
              ))}
            </div>
          )}
        </Derive>
        ~~~~~~~~~~~~~~~~~~
        <For each={items}>{(item) => <div>{item}</div>}</For>
        ~~~~~~~~~~~~~~~~~~
        {items.value.map((item) => (
          <div>{item}</div>
        ))}
      </div>
      <Counter /> */}
    </HydrationBoundary>
  )
}

// export function _Page() {
//   const count = useSignal(0)
//   const greeting = useSignal("Hello world!")
//   const a = () => 456
//   /**
//    * todo: the 'a' function is being passed and called inside the generated component.
//    * need to ensure it is called at the top level instead.
//    */
//   return (
//     <HydrationBoundary mode="lazy">
//       <HydrationBoundaryLoader
//         _props={[
//           a(),
//           true ? count.value : count.value + 2,
//           function () {
//             count.value++
//           },
//         ]}
//       />
//     </HydrationBoundary>
//   )
// }

// // loader
// export default lazy(() => ActualChildren)

// // separate module
// ActualChildren = ({ _props }) => {
//   return (
//     <div className="p-6">
//       <h1>{_props[0]}</h1>
//       <Counter count={_props[1]} onIncrement={_props[2]} />
//     </div>
//   )
// }
