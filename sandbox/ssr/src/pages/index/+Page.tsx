import { usePageContext } from "$/context/pageContext"

export function Page() {
  const { isClient } = usePageContext()
  return (
    <div className="p-6">
      <h1>Hello, world! isClient: {`${isClient}`}</h1>
    </div>
  )
}
