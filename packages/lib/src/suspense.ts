import { node, renderMode } from "./globals.js"
import {
  depsRequireChange,
  useContext,
  useHook,
  useId,
  useRequestUpdate,
  useState,
  useThrowHandler,
} from "./hooks/index.js"
import { __DEV__ } from "./env.js"
import { createContext } from "./context.js"

export { Suspense, useSuspense }

const SuspenseContext = createContext<{
  id: string
  promises: Map<string, PromiseCacheEntry<any>>
}>(null!)

type PromiseCacheEntry<T> = {
  promise: WrappedPromise<T>
  fn: () => Promise<T>
}

type SuspenseProps = {
  fallback: JSX.Element
  children: JSX.Children
}

export const PROMISE_STATUS = {
  PENDING: 0,
  FULFILLED: 1,
  REJECTED: 2,
} as const

export type WrappedPromise<T> = Promise<T> & {
  key: string
  status: (typeof PROMISE_STATUS)[keyof typeof PROMISE_STATUS]
  value: T
  reason?: any
}

const useSuspense = <T>(promiseFn: () => Promise<T>, deps: unknown[]): T => {
  const { id: suspenseId, promises } = useContext(SuspenseContext)
  const id = useId()
  return useHook("useSuspense", { deps }, ({ hook, index }) => {
    const key = `${id}:${index}`
    if (depsRequireChange(hook.deps, deps)) {
      hook.deps = deps
      promises.delete(key)
    }
    let entry = promises.get(key)
    if (!entry) {
      if (renderMode.current === "hydrate") {
        // @ts-ignore
        const metaMap = window.__kaiokenSuspenseMeta as Map<string, any>
        const x = (
          metaMap.get(suspenseId) as {
            data: WrappedPromise<T>
          }
        ).data
        entry = { promise: x, fn: promiseFn }
      } else {
        const promise = Object.assign(promiseFn(), { key }) as WrappedPromise<T>
        entry = { promise, fn: promiseFn }
        promises.set(key, entry)
      }
    }
    const p = entry.promise
    switch (p.status) {
      case PROMISE_STATUS.FULFILLED:
        return p.value
      case PROMISE_STATUS.REJECTED:
        throw p.reason
      case PROMISE_STATUS.PENDING:
        throw p
      default:
        p.status = PROMISE_STATUS.PENDING
        p.then(
          (result) => {
            p.status = PROMISE_STATUS.FULFILLED
            p.value = result
          },
          (reason) => {
            p.status = PROMISE_STATUS.REJECTED
            p.reason = reason
          }
        )
        throw p
    }
  })
}

const allPromisesResolved = (
  promises: Map<string, PromiseCacheEntry<unknown>>
) =>
  promises
    .values()
    .every(({ promise }) => promise.status !== PROMISE_STATUS.PENDING)

const isWrappedPromise = (value: unknown): value is WrappedPromise<unknown> =>
  value instanceof Promise

function Suspense({ children, fallback }: SuspenseProps): JSX.Element {
  const id = useId()
  const requestUpdate = useRequestUpdate()
  const [promises] = useState<Map<string, PromiseCacheEntry<unknown>>>(
    () => new Map()
  )

  useThrowHandler<WrappedPromise<unknown>>({
    accepts: isWrappedPromise,
    onThrow: (value) => {
      requestUpdate()
      value.then(requestUpdate)
    },
    onServerThrow(value, ctx) {
      ctx.createSuspendedContentBoundary(id, value, fallback)
      node.current!.suspended = true
      value.then(ctx.retry)
    },
  })

  let result: JSX.Children
  switch (renderMode.current) {
    case "stream":
      result = children
      break
    case "hydrate":
      result = children
      break
    case "string":
      if (__DEV__) {
        console.warn(
          "[kaioken]: Suspense is not supported via renderToString(), fallback will be rendered"
        )
      }
      result = fallback
      break
    case "dom":
      if (promises.size === 0) {
        console.log("initial render, returning children")
        result = children
        break
      } else if (allPromisesResolved(promises)) {
        // all promises have resolved, return children
        result = children
        break
      } else {
        // some promises are pending, return fallback
        result = fallback
        break
      }
    default:
      console.warn("[kaioken]: renderMode not supported")
      result = null
  }

  return SuspenseContext.Provider({ value: { id, promises }, children: result })
}
