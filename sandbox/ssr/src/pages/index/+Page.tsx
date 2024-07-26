// import { Counter } from "$/components/Counter"
// import { PageTitle } from "$/components/PageTitle"

import { useState } from "kaioken"

export function Page() {
  const [count, setCount] = useState(0)
  return (
    <div>
      {/* <PageTitle>Home</PageTitle>
      <Counter /> */}
      {/* <h1>Hello {"world"} !</h1> */}
      <h1>Hello world !</h1>
      {count} + 1<button onclick={() => setCount(count + 1)}>inc</button>
      <span>Learn more about sugondeez</span>
    </div>
  )
}
