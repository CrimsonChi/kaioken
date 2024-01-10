import { VNode } from "src/types.js"
import { g } from "../globalState.js"
import { depsRequireChange, getCurrentNode, getHook, setHook } from "./utils.js"

type useFetchHook<T> = {
  keys: string[]
  promise?: Promise<Response>
  options: RequestInit
  cleanup?: () => void
  abortController?: AbortController
  data: useFetchHookData<T>
}

type useFetchHookData<T> = {
  data?: T
  error?: Error
  loading: boolean
}

export function useFetch<T>(
  url: string,
  options: RequestInit = {},
  keys: string[] = []
): useFetchHookData<T> {
  const node = getCurrentNode("useFetch")
  if (!node) return { loading: true }

  const { hook, oldHook } = getHook<useFetchHook<T>>(node, {
    keys,
    data: { loading: true },
    promise: undefined,
    options,
  })

  // create an abort signal if not provided
  if (!hook.options.signal) {
    const abortController = new AbortController()
    hook.abortController = abortController
    hook.options.signal = abortController.signal
  }

  if (depsRequireChange(keys, oldHook?.keys)) {
    if (hook.promise) {
      Object.assign(hook.promise, { aborted: true })
      hook.abortController?.abort()
      hook.promise = undefined
      hook.abortController = undefined
      hook.options.signal = undefined
    }

    hook.data.loading = true
    hook.promise = fetch(url, options)
    handleFetch(node, hook)
  }

  hook.keys = keys

  setHook(node, hook)
  return hook.data
}

async function handleFetch<T>(node: VNode, hook: useFetchHook<T>) {
  if (!hook.promise) return
  const { promise } = hook
  let aborted = false
  try {
    const res = await promise
    if ("aborted" in promise) {
      aborted = true
      return
    }

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

    const data = await res.json()
    if ("aborted" in promise) {
      aborted = true
      return
    }
    hook.data.data = data
    hook.data.loading = false
  } catch (error: any) {
    hook.data.error = error
    hook.data.loading = false
  } finally {
    if (!aborted) g.requestUpdate(node)
    hook.abortController = undefined
    hook.options.signal = undefined
  }
}
