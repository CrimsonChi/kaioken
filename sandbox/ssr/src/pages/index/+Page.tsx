//import { useState } from "kaioken"

import { usePageContext } from "$/context/pageContext"
import { Portal, signal, useState } from "kaioken"

const key = signal(0)
export function Page() {
  const { isClient } = usePageContext()
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

      <div id="test">
        {isClient && (
          <Portal container={document.getElementById("portal")!}>
            <div>Content 0</div>
          </Portal>
        )}
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
        <div>Content 4</div>
      </div>
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
