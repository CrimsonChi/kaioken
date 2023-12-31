import { useState, useEffect } from "reflex-ui"

export const App = () => {
  const [count, setCount] = useState(0)
  console.log("App", count)

  useEffect(() => {
    console.log("App useEffect", count)
  })

  return (
    <div>
      <h1>App</h1>
      {count}
      <button
        onclick={() => {
          setCount(count + 1)
        }}
      >
        Increment
      </button>
    </div>
  )
}
