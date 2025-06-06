import { createContext, memo, useContext, useState } from "kaioken"

type CountContextType = {
  count: number
  setCount: (value: Kaioken.StateSetter<number>) => void
}
const CountContext = createContext<CountContextType>(null!)
const useCount = () => useContext(CountContext)

export default function MemoExample() {
  const [count, setCount] = useState(0)
  const [otherCount, setOtherCount] = useState(0)

  console.log("MemoExample")

  return (
    <>
      <button onclick={() => setOtherCount(otherCount + 1)}>
        other count: {otherCount}
      </button>
      <CountContext.Provider value={{ count, setCount }}>
        <Counter />
      </CountContext.Provider>
    </>
  )
}

const Counter = memo(Counter_)

function Counter_() {
  console.log("Counter_")
  return <CounterChild />
}

const CounterChild = memo(CounterChild_)
function CounterChild_() {
  const { count, setCount } = useCount()
  console.log("CounterChild_")
  return (
    <>
      <button onclick={() => setCount(count + 1)}>count: {count}</button>
    </>
  )
}

// import { Button } from "./atoms/Button"

// const count = signal(0)
// const name = signal("123")
// name.subscribe((name) => console.log("name changed", name))

// const NameContext = createContext("")

// export default function MemoExample() {
//   return (
//     <div id="memo">
//       <input bind:value={name} />
//       <span>Count: {count.value}</span>
//       <Button onclick={() => count.value++}>Increment</Button>
//       <MemoizedComponent test="test" />
//       <Derive from={name}>
//         {(name) => (
//           <NameContext.Provider value={name}>
//             <MemoizedContextConsumer />
//           </NameContext.Provider>
//         )}
//       </Derive>
//     </div>
//   )
// }

// const MemoizedComponent = memo(({ test: _test }: { test: string }) => {
//   console.log("render MemoizedComponent")
//   const [ref, name] = useModel<HTMLInputElement>("")
//   return (
//     <div id="memo-dynamic" className="flex flex-col">
//       <input ref={ref} type="text" />
//       <span>Name: {name}</span>
//     </div>
//   )
// })

// const MemoizedContextConsumer = memo(() => {
//   console.log("render MemoizedContextConsumer")
//   const name = useContext(NameContext)
//   return (
//     <div>
//       <span>Name: {name}</span>
//     </div>
//   )
// })
