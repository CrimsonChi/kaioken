import { g } from "../globalState.js"
import { arrayChanged, getCurrentNode, getHook, setHook } from "./utils.js"

type useQueryHook<T> = {
  data?: T
  error?: Error
  loading: boolean
  keys: string[]
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  keys: string[] = []
): useQueryHook<T> {
  const node = getCurrentNode("useQuery must be called in a component")
  if (!node) return { loading: false, keys }

  const { hook, oldHook } = getHook<useQueryHook<T>>(node, {
    keys,
    loading: false,
  })

  if (arrayChanged(keys, oldHook?.keys)) {
    hook.data = undefined
  }

  if (hook.data === undefined && !hook.loading) {
    hook.loading = true
    queryFn()
      .then((data) => {
        hook.data = data
        hook.loading = false
        g.setWipNode(node)
      })
      .catch((error) => {
        hook.error = error
        hook.loading = false
        g.setWipNode(node)
      })
  }

  setHook(node, hook)
  return hook
}
