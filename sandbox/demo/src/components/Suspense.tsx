import { Suspense } from "kaioken"
import { MyClassComponent } from "./ClassComponent"

type Props = {
  test: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function Todos(props: Props) {
  const res = await fetch("https://jsonplaceholder.typicode.com/todos")
  const data = await res.json()
  await sleep(1000)
  return (
    <div>
      {props.test}
      {data.map((item: any) => (
        <div>{item.title}</div>
      ))}
    </div>
  )
}

export function SuspenseExample() {
  return (
    <div>
      <Suspense fallback={() => <div>Loading...</div>}>
        <AnotherComponent />
        <MyClassComponent data={123} />
        <h1>Something</h1>
        <Todos test={123} />
        123
        <br />
        {456}
      </Suspense>
    </div>
  )
}

function AnotherComponent() {
  return <h1>AnotherComponent</h1>
}
