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
      {count % 2 === 0 ? <a href="#">Test</a> : <a className="asd">Testw</a>}
      {count % 2 === 0 ? (
        <Button onclick={increment} tabIndex={-1} ariaCurrent={"true"}>
          +1
        </Button>
      ) : (
        <Button onclick={increment} formMethod="post">
          +1
        </Button>
      )}
    </Container>
  )
}
