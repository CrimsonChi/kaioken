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
  const node = getCurrentNode("useQuery must be called in a component")
  if (!node) return { loading: true }

  const { hook, oldHook } = getHook<useQueryHook<T>>(node, {
    keys,
    loading: false,
  })

  if (arrayChanged(keys, oldHook?.keys)) {
    hook.keys = keys
    hook.loading = true
    queryFn()
      .then((data) => {
        hook.error = undefined
        hook.data = data
        hook.loading = false
        g.setWipNode(node)
      })
      .catch((error) => {
        hook.error = error
        hook.loading = false
        hook.data = undefined
        g.setWipNode(node)
      })
  }
  setHook(node, hook)
  const { keys: k, ...rest } = hook
  return rest
}
