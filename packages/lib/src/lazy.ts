import { createElement } from "./element.js"
import { renderMode } from "./globals.js"
import { useRequestUpdate } from "./hooks/utils.js"

type FCModule = { default: Kaioken.FC<any> }
type LazyImportValue = Kaioken.FC<any> | FCModule
type InferProps<T extends LazyImportValue> = T extends FCModule
  ? Kaioken.InferProps<T["default"]>
  : Kaioken.InferProps<T>

type LazyState = {
  promise: Promise<LazyImportValue>
  result: Kaioken.FC | null
}

type LazyComponentProps<T extends LazyImportValue> = InferProps<T> & {
  fallback?: JSX.Element
}

const lazyCache = new WeakMap<() => Promise<LazyImportValue>, LazyState>()

export function lazy<T extends LazyImportValue>(
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
      promise.then((componentOrModule) => {
        state.result =
          typeof componentOrModule === "function"
            ? componentOrModule
            : componentOrModule.default
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
