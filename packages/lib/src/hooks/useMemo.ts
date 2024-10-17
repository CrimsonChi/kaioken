import { __DEV__ } from "../env.js"
import {
  depsRequireChange,
  sideEffectsEnabled,
  useHook,
  useHookHMRInvalidation,
} from "./utils.js"

export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  if (!sideEffectsEnabled()) return factory()
  if (__DEV__) {
    useHookHMRInvalidation(...arguments)
  }
  return useHook(
    "useMemo",
    { deps, value: undefined as T },
    ({ hook, isInit }) => {
      if (isInit || depsRequireChange(deps, hook.deps)) {
        hook.deps = deps
        hook.value = factory()
      }
      return hook.value
    }
  )
}
