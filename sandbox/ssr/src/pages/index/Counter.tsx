import { useSignal } from "kaioken"

type CounterProps = {
  test: number
}
export default function Counter(props: CounterProps) {
  const count = useSignal(0)

  console.log("Counter", props.test)

  return (
    <>
      <span>Count: {count}</span>{" "}
      <button
        onclick={() => count.value++}
        className="bg-primary hover:bg-primary-light text-white font-bold text-sm py-2 px-4 rounded"
      >
        Increment
      </button>
    </>
  )
}
