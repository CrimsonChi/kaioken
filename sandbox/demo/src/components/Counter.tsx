import { useState } from "kaioken"
import { Button } from "./atoms/Button"
import { Container } from "./atoms/Container"

export function Counter() {
  const [count, setCount] = useState(0)

  const increment = () => {
    setCount(count + 1)
  }

  const decrement = () => {
    setCount(count - 1)
  }

  return (
    <Container className="flex gap-2 items-center">
      <Button onclick={decrement}>-1</Button>
      <span>count: {count}</span>
      <Button onclick={increment}>+1</Button>
    </Container>
  )
}
