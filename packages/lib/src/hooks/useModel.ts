import { noop } from "../utils.js"
import { shouldExecHook, useHook } from "./utils.js"

export function useModel<
  T extends HTMLElement,
  U extends string | number | boolean = string,
>(initial: U): [Kaioken.Ref<T>, U, (newValue: U) => void] {
  if (!shouldExecHook()) {
    return [{ current: null }, initial, () => {}]
  }
  return useHook(
    "useModel",
    {
      value: initial,
      ref: { current: null } as Kaioken.Ref<T>,
      dispatch: noop as (value: U) => void,
    },
    ({ hook, oldHook, update, queueEffect }) => {
      if (!oldHook) {
        hook.dispatch = (value: U) => {
          if (value !== hook.value) {
            hook.value = value
            if (hook.ref.current) setElementValue(hook.ref.current, value)
            update()
          }
        }
      }

      queueEffect(() => {
        const element = hook.ref.current
        if (!element) {
          return
        }
        if (!oldHook) setElementValue(element, hook.value)

        const listener = () => hook.dispatch(getElementValue(element) as U)

        element.addEventListener("input", listener)
        return () => {
          element.removeEventListener("input", listener)
        }
      })

      return [hook.ref, hook.value, hook.dispatch] as const
    }
  )
}

function setElementValue(element: HTMLElement, value: unknown) {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case "checkbox":
        element.checked = value as boolean
        break
      case "radio":
        element.checked = value === element.value
        break
      default:
        element.value = value as string
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = value as string
  } else if (element instanceof HTMLSelectElement) {
    element.value = value as string
  }
}

function getElementValue(element: HTMLElement) {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case "checkbox":
        return element.checked
      case "radio":
        return element.checked ? element.value : undefined
      default:
        return element.value
    }
  } else if (element instanceof HTMLTextAreaElement) {
    return element.value
  } else if (element instanceof HTMLSelectElement) {
    return element.value
  }

  return undefined
}
