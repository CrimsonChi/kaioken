import { HydrationBoundary } from "kaioken/ssr"
import Counter, { test } from "./Counter"

export function Page() {
  console.log(test)
  return (
    <div className="p-6">
      <h1>Hello, world!</h1>
      <HydrationBoundary mode="lazy">
        <Counter />
      </HydrationBoundary>
    </div>
  )
}
