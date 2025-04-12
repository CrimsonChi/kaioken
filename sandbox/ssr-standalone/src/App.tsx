import { useSignal } from "kaioken"
import SuspenseExample from "./components/SuspenseExample"

export default function App() {
  return (
    <>
      <Counter />
      <h1>Hello World</h1>
      <SuspenseExample />
    </>
  )
}

const Counter = () => {
  const count = useSignal(0)
  return (
    <div>
      <span>Count: {count}</span>
      <button onclick={() => count.value++}>Increment</button>
    </div>
  )
}
