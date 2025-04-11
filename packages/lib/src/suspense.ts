import { renderMode } from "./globals.js"
import { useRef, useRequestUpdate, useThrowHandler } from "./hooks/index.js"
import { __DEV__ } from "./env.js"

export { Suspense, useSuspense }

type SuspenseProps = {
  fallback: JSX.Element
  children: JSX.Children
}

const PROMISE_STATUS = {
  PENDING: 0,
  FULFILLED: 1,
  REJECTED: 2,
} as const

type WrappedPromise<T> = Promise<T> & {
  status: (typeof PROMISE_STATUS)[keyof typeof PROMISE_STATUS]
  value: T
  reason?: any
}

function useSuspense<T>(promise: Promise<T>) {
  const p = promise as WrappedPromise<T>
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
      throw promise
  }
}

function isPromise<T>(value: any): value is Promise<T> {
  return value instanceof Promise
}

const allPromisesResolved = (promises: Set<WrappedPromise<unknown>>) =>
  promises.values().every(({ status }) => status !== PROMISE_STATUS.PENDING)

function Suspense({ children, fallback }: SuspenseProps): JSX.Element {
  const requestUpdate = useRequestUpdate()
  const promises = useRef<Set<WrappedPromise<unknown>> | null>(null)

  useThrowHandler<WrappedPromise<unknown>>({
    accepts: isPromise,
    onThrow: (value) => {
      ;(promises.current ??= new Set()).add(value)
      value.then(requestUpdate)
    },
  })

  switch (renderMode.current) {
    case "stream":
      return children

    case "hydrate":
      return fallback

    case "string":
      if (__DEV__) {
        console.warn(
          "[kaioken]: Suspense is not supported via renderToString(), fallback will be rendered"
        )
      }
      return fallback

    case "dom":
      if (!promises.current || promises.current.size === 0) {
        console.log("initial render, returning children")
        return children
      } else if (allPromisesResolved(promises.current)) {
        // all promises have resolved, return children
        return children
      } else {
        // some promises are pending, return fallback
        return fallback
      }
    default:
      console.warn("[kaioken]: renderMode not supported")
      return null
  }
}
