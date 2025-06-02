import { HydrationBoundary } from "kaioken/ssr"
import Counter from "./Counter"
import { createContext, useSignal } from "kaioken"

// const ThemeContext = createContext<"light" | "dark">("dark")
// <ThemeContext.Provider value="dark">
// {(value) => <div>{value}</div>}
// </ThemeContext.Provider>
const a = () => 123
export function Page() {
  const count = useSignal(0)
  const greeting = useSignal("Hello world!")
  const a = () => 456
  const items = useSignal([1, 2, 3])
  /**
   * todo: the 'a' function is being passed and called inside the generated component.
   * need to ensure it is called at the top level instead.
   */
  return (
    <HydrationBoundary mode="lazy">
      <div className="p-6">
        <h1>{a()}</h1>
        {items.value.map((item) => (
          <div>{item}</div>
        ))}
        <Counter
          count={true ? count.value : count.value + 2}
          onIncrement={function () {
            count.value++
          }}
        />
      </div>
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
