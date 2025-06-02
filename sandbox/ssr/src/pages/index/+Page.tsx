import { HydrationBoundary } from "kaioken/ssr"
import Counter from "./Counter"
import { useSignal } from "kaioken"

export function Page() {
  const count = useSignal(0)
  const greeting = useSignal("Hello world!")
  return (
    <HydrationBoundary mode="lazy">
      <div className="p-6">
        <h1>{greeting}</h1>
        <Counter
          count={count.value}
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
//   return (
//     <HydrationBoundary mode="lazy">
//       <HydrationBoundaryChildrenLoader
//         _props={[
//           count,
//           greeting,
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
