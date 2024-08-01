//import { useState } from "kaioken"

import { signal, useState } from "kaioken"

const key = signal(0)
export function Page() {
  return (
    <div>
      <h1>Hello world !</h1>
      <p>
        <button onclick={() => key.value++}>Click me {key.value}</button>
      </p>
      <Counter>
        {(count, increment) => (
          <div>
            <p>Count: {count}</p>
            <button onclick={increment}>Increment</button>
          </div>
        )}
      </Counter>
    </div>
  )
}

function Counter({
  children,
}: {
  children: (count: number, increment: () => void) => JSX.Element
}) {
  const [value, setValue] = useState(0)
  const increment = () => setValue(value + 1)
  return children(value, increment)
}
