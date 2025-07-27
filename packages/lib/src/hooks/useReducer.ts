import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

/**
 * Creates 'dispatcher-driven' state.
 *
 * @see https://kaioken.dev/docs/hooks/useReducer
 */
export function useReducer<T, A>(
  reducer: (state: T, action: A) => T,
  state: T
): readonly [T, (action: A) => void] {
  if (!sideEffectsEnabled()) return [state, noop]

  return useHook(
    "useReducer",
    { state, dispatch: noop as (action: A) => void },
    ({ hook, isInit, isHMR, update }) => {
      if (__DEV__) {
        if (isInit) {
          hook.dev = {
            devtools: {
              get: () => ({ value: hook.state }),
              set: ({ value }) => (hook.state = value),
            } satisfies Kaioken.HookDevtoolsProvisions<{ value: T }>,
            initialArgs: [reducer, state],
          }
        }
        if (isHMR) {
          const [r, s] = hook.dev!.initialArgs
          if (r !== reducer || s !== state) {
            hook.state = state
            isInit = true
            hook.dev!.initialArgs = [reducer, state]
          }
        }
      }
      if (isInit) {
        hook.dispatch = (action: A) => {
          const newState = reducer(hook.state, action)
          if (Object.is(hook.state, newState)) return
          hook.state = newState
          update()
        }
      }
      return [hook.state, hook.dispatch] as const
    }
  )
}
