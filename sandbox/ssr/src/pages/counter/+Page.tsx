import Counter from "$/components/Counter"
import { PageTitle } from "$/components/PageTitle"

export { Page }

function Page() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div>
        <PageTitle>Counter</PageTitle>
        <br />
        <Counter />
      </div>
    </div>
  )
}
