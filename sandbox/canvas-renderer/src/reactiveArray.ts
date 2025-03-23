export function reactiveArray<T>(onChange: () => void): T[] {
  const array: T[] = []

  return new Proxy(array, {
    get(target, prop, receiver) {
      // Allow regular array functionality
      const value = Reflect.get(target, prop, receiver)
      if (
        typeof value === "function" &&
        [
          "push",
          "pop",
          "shift",
          "unshift",
          "splice",
          "sort",
          "reverse",
        ].includes(prop.toString())
      ) {
        return (...args: any[]) => {
          const result = value.apply(target, args)
          onChange()
          return result
        }
      }
      return value
    },
    set(target, prop, value, receiver) {
      // Set the value and trigger the callback for direct assignments
      const result = Reflect.set(target, prop, value, receiver)
      onChange()
      return result
    },
  })
}
