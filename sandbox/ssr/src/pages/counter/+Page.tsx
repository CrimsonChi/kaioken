import Counter from "$/components/Counter"
import { PageTitle } from "$/components/PageTitle"
import { signal, useEffect } from "kaioken"

export { Page }

function Page() {
  const id = signal(0)
  useEffect(() => {
    const interval = setInterval(() => (id.value += 2), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      id={id.map((v) => v.toString())}
      className="w-full h-full flex items-center justify-center"
    >
      <div>
        <PageTitle>Counter</PageTitle>
        <br />
        <Counter />
      </div>
    </div>
  )
}
