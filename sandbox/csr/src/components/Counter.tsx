import { Button } from "./atoms/Button"
import { Container } from "./atoms/Container"
import { useCountStore } from "../store"
import { useAsync } from "kaioken"

export function Counter() {
  const { value: count, increment, decrement } = useCountStore()

  const data = useAsync(
    () =>
      fetch("https://dummyjson.com/products/1").then((res) => {
        console.log("resolving req")
        return res.json()
      }),
    []
  )

  console.log("Counter", data)

  return (
    <Container className="flex gap-2 items-center">
      <Button onclick={decrement}>-1</Button>
      <span>count: {count}</span>
      {count % 2 === 0 ? <a href="#">Test</a> : <a className="asd">Testw</a>}
      <Button onclick={increment}>+1</Button>
    </Container>
  )
}
