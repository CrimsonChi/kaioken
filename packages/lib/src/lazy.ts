import { createElement } from "./element.js"
import { useRequestUpdate } from "./hooks/utils.js"

const lazyCache = new WeakMap<() => Promise<Kaioken.FC>, Kaioken.FC | null>()

type LazyComponentProps<T extends Kaioken.FC> = Kaioken.InferProps<T> & {
  fallback?: JSX.Element
}

export function lazy<T extends Kaioken.FC>(
  componentPromise: () => Promise<T>
): Kaioken.FC<LazyComponentProps<T>> {
  function LazyComponent(props: LazyComponentProps<T>) {
    const { fallback = null, ...rest } = props
    const requestUpdate = useRequestUpdate()
    if (!lazyCache.has(componentPromise)) {
      lazyCache.set(componentPromise, null)
      componentPromise().then((component) => {
        lazyCache.set(componentPromise, component)
        requestUpdate()
      })
      return fallback
    }

    const component: Kaioken.FC<LazyComponentProps<T>> | null =
      lazyCache.get(componentPromise)!
    if (component === null) {
      componentPromise().then(requestUpdate)
      return fallback
    }
    return createElement(component, rest)
  }
  LazyComponent.displayName = "Kaioken.lazy"
  return LazyComponent
}
