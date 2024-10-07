import Counter from "$/components/Counter"
import { PageTitle } from "$/components/PageTitle"
import { computed, signal, useEffect } from "kaioken"

export { Page }

function Page() {
  const id = signal(0)
  const divId = computed(() => id.value.toString(), "divId")
  useEffect(() => {
    const interval = setInterval(() => (id.value += 2), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div id={divId} className="w-full h-full flex items-center justify-center">
      <div>
        <PageTitle>Counter</PageTitle>
        <br />
        <Counter />
      </div>
    </div>
  )
}
