import { HydrationBoundary } from "kaioken/ssr"
import Counter from "./Counter"

export function Page() {
  return (
    <HydrationBoundary mode="lazy">
      <div className="p-6">
        <h1>Hello, world!</h1>
        <Counter test={789} />
      </div>
    </HydrationBoundary>
  )
}
