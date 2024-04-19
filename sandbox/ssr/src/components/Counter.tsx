import { signal } from "kaioken"

export function Counter() {
  const count = signal(0)

  return (
    <>
      <span>count: {count}</span>
      <br />
      <button className="px-2 py-1 bg-indigo-700" onclick={() => count.value++}>
        Increment
      </button>
      <p innerHTML={count.value * 2} />
    </>
  )
}
