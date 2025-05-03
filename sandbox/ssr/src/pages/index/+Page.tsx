import { usePageContext } from "$/context/pageContext"
import { useSignal } from "kaioken"

export function Page() {
  const { isClient } = usePageContext()
  const text = useSignal("Hello, world!")
  return (
    <div className="p-6">
      <h1>Hello, world! isClient: {`${isClient}`}</h1>
      <input bind:value={text} />
    </div>
  )
}
