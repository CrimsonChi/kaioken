import { depsRequireChange, useHook } from "./utils.js"

export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  return useHook(
    "useMemo",
    { deps, value: undefined as T },
    ({ hook, oldHook }) => {
      if (depsRequireChange(deps, oldHook?.deps)) {
        hook.deps = deps
        hook.value = factory()
      }
      return hook.value
    }
  )
}
