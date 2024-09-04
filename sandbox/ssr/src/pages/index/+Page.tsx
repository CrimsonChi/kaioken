import { PageTitle } from "$/components/PageTitle"
import { Portal } from "kaioken"

export { Page }

function Page() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <PageTitle>Home</PageTitle>
      <Portal container={() => document.getElementById("portal-root")!}>
        <div>Portal</div>
      </Portal>
    </div>
  )
}
