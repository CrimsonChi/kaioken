import { Button } from "./atoms/Button"
import { Container } from "./atoms/Container"
import { useCountStore } from "../store"

export function Counter() {
  const { count, increment, decrement } = useCountStore((store) => ({
    count: store.value.count,
    increment: store.increment,
    decrement: store.decrement,
  }))

  return (
    <Container className="flex gap-2 items-center">
      <Button onclick={decrement}>-1</Button>
      <span>count: {count}</span>
      <Button onclick={increment}>+1</Button>
    </Container>
  )
}
