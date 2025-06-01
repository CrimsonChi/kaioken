import type { Signal } from "kaioken"

type CounterProps = {
  count: Signal<number>
  onIncrement: () => void
}
export default function Counter(props: CounterProps) {
  console.log("Counter")
  return (
    <>
      <span>Count: {props.count}</span>{" "}
      <button
        onclick={props.onIncrement}
        className="bg-primary hover:bg-primary-light text-white font-bold text-sm py-2 px-4 rounded"
      >
        Increment
      </button>
    </>
  )
}
