import { depsRequireChange, useHook } from "./utils.js"

export function useMemo<T>(factory: () => T, deps: any[]): T {
  return useHook(
    "useMemo",
    { deps, value: undefined as T },
    ({ hook, oldHook }) => {
      if (depsRequireChange(deps, oldHook?.deps)) {
        hook.value = factory()
        hook.deps = deps
      }
      return hook.value
    }
  )
}
