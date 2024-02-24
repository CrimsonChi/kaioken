import { isSSR, useHook } from "./utils.js"

export function useModel<
  T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  U extends string | number | boolean,
>(initial: U): [Kaioken.Ref<T>, U, (newValue: U) => void] {
  if (isSSR) {
    return [{ current: null }, initial, () => {}]
  }
  return useHook(
    "useModel",
    { value: initial, ref: { current: null } as Kaioken.Ref<T> },
    ({ hook, oldHook, update, queueEffect }) => {
      const setValue = (value: U) => {
        if (value !== hook.value) {
          hook.value = value
          if (hook.ref.current) setElementValue(hook.ref.current, value)
          update()
        }
      }

      queueEffect(() => {
        const element = hook.ref.current
        if (!element) {
          return
        }
        if (!oldHook) setElementValue(element, hook.value)

        const listener = () => setValue(getElementValue(element) as U)

        element.addEventListener("input", listener)
        return () => {
          element.removeEventListener("input", listener)
        }
      })

      return [hook.ref, hook.value, setValue] as const
    }
  )
}

function setElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown
) {
  switch (element.type) {
    case "checkbox":
      ;(element as HTMLInputElement).checked = value as boolean
      break
    case "radio":
      ;(element as HTMLInputElement).checked = value === element.value
      break
    default:
      element.value = value as string
  }
}

function getElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
) {
  switch (element.type) {
    case "checkbox":
      return (element as HTMLInputElement).checked
    case "radio":
      return (element as HTMLInputElement).value
    default:
      return element.value
  }
}
