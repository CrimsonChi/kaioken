import { ElementProps } from "src/types.js"
import { __DEV__ } from "../env.js"
import { noop } from "../utils.js"
import { sideEffectsEnabled, useHook } from "./utils.js"

type ToPrimitive<T extends string | number | boolean | FileList | null> =
  T extends null
    ? null
    : T extends string
      ? string
      : T extends boolean
        ? boolean
        : T extends FileList
          ? FileList
          : never

type UseModelReturn<
  T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  U extends string | boolean | FileList | null,
> = readonly [
  Kaioken.RefObject<T>,
  ToPrimitive<U>,
  (newValue: ToPrimitive<U>) => void,
]

export function useModel<
  T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  U extends string | boolean | FileList | null = string,
>(
  initial: U
): readonly [
  Kaioken.RefObject<T>,
  ToPrimitive<U>,
  (newValue: ToPrimitive<U>) => void,
] {
  if (!sideEffectsEnabled()) {
    return [{ current: null }, initial, noop] as any as UseModelReturn<T, U>
  }
  return useHook(
    "useModel",
    {
      value: initial,
      element: null as T | null,
      ref: { current: null } as Kaioken.RefObject<T>,
      dispatch: noop as (value: U) => void,
      listener: noop as () => void,
    },
    ({ hook, isInit, update, queueEffect }) => {
      if (isInit) {
        hook.cleanup = () => {
          hook.element &&
            hook.element.removeEventListener("input", hook.listener)
        }
        hook.listener = () =>
          hook.element && hook.dispatch(getElementValue(hook.element) as U)

        hook.dispatch = (value: U) => {
          if (hook.ref.current) setElementValue(hook.ref.current, value)
          if (value !== hook.value) {
            hook.value = value
            update()
          }
        }

        if (__DEV__) {
          hook.debug = {
            get: () => ({ value: hook.value }),
            set: ({ value }) => {
              hook.value = value
              if (hook.ref.current) setElementValue(hook.ref.current, value)
            },
          }
        }
      }

      queueEffect(
        () => {
          const refCurrent = hook.ref.current
          if (!refCurrent) {
            if (hook.element) {
              hook.element.removeEventListener("input", hook.listener)
              hook.element = null
            }
            return
          }
          if (refCurrent !== hook.element) {
            hook.element &&
              hook.element.removeEventListener("input", hook.listener)
            hook.element = refCurrent
            hook.element.addEventListener("input", hook.listener)
            setElementValue(hook.element, hook.value)
          }
        },
        { immediate: true }
      )

      return [hook.ref, hook.value, hook.dispatch] as unknown as UseModelReturn<
        T,
        U
      >
    }
  )
}

function setElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown
) {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case "checkbox":
        element.checked = !!value
        break
      case "radio":
        console.warn("[useModel] useModel does not support: radio")
        break
      case "file":
        if (value instanceof FileList) {
          element.files = value
          return
        }
        element.value = ""
        break
      default:
        element.value = !!value ? (value as string) : ""
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = !!value ? (value as string) : ""
  } else if (element instanceof HTMLSelectElement) {
    element.value = value as string
  }
}

function getElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
) {
  if (element instanceof HTMLInputElement) {
    switch (element.type as ElementProps<"input">["type"]) {
      case "checkbox":
        return element.checked
      case "radio":
        console.warn("[useModel] useModel does not support: radio")
        return
      case "file":
        return element.files
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
