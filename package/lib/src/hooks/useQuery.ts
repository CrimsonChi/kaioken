import { g } from "../globalState.js"
import { getCurrentNode, getHook, setHook } from "./utils.js"

type useQueryHook<T> = {
  data?: T
  error?: Error
  isLoading: boolean
  keys: string[]
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  keys: string[] = []
): useQueryHook<T> {
  const node = getCurrentNode("useQuery must be called in a component")
  if (!node) return { isLoading: false, keys }

  const { hook, oldHook } = getHook<useQueryHook<T>>(node, {
    keys,
    isLoading: false,
  })

  if (oldHook) {
    if (keys.length === 0 || keys.some((key, i) => key !== oldHook.keys[i])) {
      hook.data = undefined
    }
  }

  if (hook.data === undefined) {
    queryFn()
      .then((data) => {
        hook.data = data
        g.setWipNode(node)
      })
      .catch((error) => {
        hook.error = error
        g.setWipNode(node)
      })
  }

  setHook(node, hook)
  return {
    ...hook,
    isLoading: hook.data === undefined,
    error: hook.error,
  }
}
