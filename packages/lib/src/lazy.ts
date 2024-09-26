import { createElement } from "./element.js"
import { renderMode } from "./globals.js"
import { useRequestUpdate } from "./hooks/utils.js"

type LazyState = {
  promise: Promise<Kaioken.FC>
  result: Kaioken.FC | null
}

type LazyComponentProps<T extends Kaioken.FC> = Kaioken.InferProps<T> & {
  fallback?: JSX.Element
}

const lazyCache = new WeakMap<() => Promise<Kaioken.FC>, LazyState>()

export function lazy<T extends Kaioken.FC>(
  componentPromise: () => Promise<T>
): Kaioken.FC<LazyComponentProps<T>> {
  function LazyComponent(props: LazyComponentProps<T>) {
    const { fallback = null, ...rest } = props
    if (renderMode.current === "string" || renderMode.current === "stream") {
      return fallback
    }
    const requestUpdate = useRequestUpdate()
    const cachedState = lazyCache.get(componentPromise)

    if (!cachedState) {
      const promise = componentPromise()
      const state: LazyState = {
        promise,
        result: null,
      }
      lazyCache.set(componentPromise, state)
      promise.then((component) => {
        state.result = component
        requestUpdate()
      })
      return fallback
    }

    if (cachedState.result === null) {
      cachedState.promise.then(requestUpdate)
      return fallback
    }
    return createElement(cachedState.result, rest)
  }
  LazyComponent.displayName = "Kaioken.lazy"
  return LazyComponent
}
