import { Button } from "./atoms/Button"
import { Container } from "./atoms/Container"
import { useCountStore } from "../store"

export function Counter({ test, children }: { test?: string; children?: any }) {
  const { value: count, increment, decrement } = useCountStore()

  return (
    <div className="flex flex-col">
      <Container className="flex gap-2 items-center">
        <Button onclick={decrement}>-1</Button>
        <span>count: {count}</span>
        {count % 2 === 0 ? <a href="#">Test</a> : <a className="asd">Testw</a>}
        <Button onclick={increment}>+1</Button>
      </Container>
      <div>{children}</div>
      <div>{test}</div>
    </div>
  )
}
