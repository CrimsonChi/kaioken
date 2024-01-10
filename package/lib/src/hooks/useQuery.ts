import { g } from "../globalState.js"
import { arrayChanged, getCurrentNode, getHook, setHook } from "./utils.js"

type useQueryHook<T> = {
  data?: T
  error?: Error
  loading: boolean
  keys: string[]
}

type useQueryHookData<T> = Omit<useQueryHook<T>, "keys">

export function useQuery<T>(
  queryFn: () => Promise<T>,
  keys: string[] = []
): useQueryHookData<T> {
  const node = getCurrentNode("useQuery")
  if (!node) return { loading: true }

  const { hook, oldHook } = getHook<useQueryHook<T>>(node, {
    keys,
    loading: false,
  })

  if (arrayChanged(oldHook?.keys, keys)) {
    hook.keys = keys
    hook.loading = true
    queryFn()
      .then((data) => {
        hook.error = undefined
        hook.data = data
        hook.loading = false
        g.requestUpdate(node)
      })
      .catch((error) => {
        hook.error = error
        hook.loading = false
        hook.data = undefined
        g.requestUpdate(node)
      })
  }
  setHook(node, hook)
  const { keys: k, ...rest } = hook
  return rest
}
