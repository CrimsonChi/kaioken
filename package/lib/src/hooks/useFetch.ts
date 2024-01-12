import { depsRequireChange, useHook } from "./utils.js"

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

export function useFetch<T extends unknown>(
  url: string,
  options: RequestInit = {},
  keys?: string[]
): useFetchHookData<T> {
  const defaultHook: useFetchHook<T> = {
    keys: keys ?? [url, JSON.stringify(options)],
    data: { loading: true },
    promise: undefined as Promise<Response> | undefined,
    options,
    abortController: undefined as AbortController | undefined,
  }

  return useHook("useFetch", defaultHook, ({ hook, oldHook, update }) => {
    // create an abort signal if not provided
    if (!hook.options.signal) {
      const abortController = new AbortController()
      hook.abortController = abortController
      hook.options.signal = abortController.signal
    }

    const newKeys = keys ?? [url, JSON.stringify(options)]
    if (depsRequireChange(newKeys, oldHook?.keys)) {
      hook.keys = newKeys
      if (hook.data.data) hook.data.data = undefined
      if (hook.promise) {
        Object.assign(hook.promise, { aborted: true })
        hook.abortController?.abort()
        hook.promise = undefined
        hook.abortController = undefined
        hook.options.signal = undefined
      }

      hook.data.loading = true
      hook.promise = fetch(url, options)
      handleFetch(hook, update)
    }

    return hook.data
  })
}

async function handleFetch<T extends unknown>(
  hook: useFetchHook<T>,
  requestUpdate: () => void
) {
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
    if (!aborted) requestUpdate()
    hook.abortController = undefined
    hook.options.signal = undefined
  }
}
