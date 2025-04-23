import { shallowCompare } from "../utils.js"
import { useEffect } from "./useEffect.js"
import { useHook, useRequestUpdate } from "./utils.js"

type RecordKey<T extends Record<string, unknown>> = keyof T & string

type FormFieldValidator<T extends unknown> = ({
  value,
}: {
  value: T
}) => string | false | undefined

type AsyncFormFieldValidator<T extends unknown> = ({
  value,
}: {
  value: T
}) => Promise<string | false | undefined>

type FormFieldValidators<T> = {
  onBlur?: FormFieldValidator<T>
  onChange?: FormFieldValidator<T>
  onChangeAsyncDebounceMs?: number
  onChangeAsync?: AsyncFormFieldValidator<T>
  onMount?: FormFieldValidator<T>
  onSubmit?: FormFieldValidator<T>
}

export type FormFieldContext<
  T extends Record<string, unknown>,
  U extends RecordKey<T>
> = {
  name: U
  state: {
    value: T[U]
    errors: string[]
    isTouched: boolean
    isValidating: boolean
  }
  handleChange: (value: T[U]) => void
  handleBlur: () => void
}
export type AnyFormFieldContext = FormFieldContext<any, any>

interface FormFieldProps<
  T extends Record<string, unknown>,
  Name extends RecordKey<T>
> {
  name: Name
  validators?: FormFieldValidators<T[Name]>
  children: (context: FormFieldContext<T, Name>) => JSX.Element
}

type SelectorState<T extends Record<string, unknown>> = {
  values: T
  canSubmit: boolean
  isSubmitting: boolean
}

interface FormSubscribeProps<
  T extends Record<string, unknown>,
  SelectorFunction extends (state: SelectorState<T>) => unknown,
  U
> {
  selector: SelectorFunction
  children: (selection: U) => JSX.Element
}

type FieldComponent<T extends Record<string, unknown>> = <
  Name extends RecordKey<T>
>(
  props: FormFieldProps<T, Name>
) => JSX.Element

type SubscribeComponent<T extends Record<string, unknown>> = <
  Selector extends (state: SelectorState<T>) => unknown
>(
  props: FormSubscribeProps<T, Selector, ReturnType<Selector>>
) => JSX.Element

type UseFormReturn<T extends Record<string, unknown>> = {
  Field: FieldComponent<T>
  Subscribe: SubscribeComponent<T>
  handleSubmit: () => Promise<void>
  reset: () => void
}

type FormContext<T extends Record<string, unknown>> = {
  state: T
  validateForm: () => Promise<string[]>
  resetField: (name: RecordKey<T>) => void
  deleteField: (name: RecordKey<T>) => void
  setFieldValue: <K extends RecordKey<T>>(name: K, value: T[K]) => void
}

type UseFormConfig<T extends Record<string, unknown>> = {
  initialValues?: T
  onSubmit?: (ctx: FormContext<T>) => void | Promise<void>
  onSubmitInvalid?: (ctx: FormContext<T>) => void | Promise<void>
}

interface FormStateSubscriber<T extends Record<string, unknown>> {
  selector: (state: SelectorState<T>) => unknown
  selection: ReturnType<this["selector"]>
  update: () => void
}

type UseFormInternalState<T extends Record<string, unknown>> = {
  Field: FieldComponent<T>
  Subscribe: SubscribeComponent<T>
  getFormContext: () => FormContext<T>
  validateForm: () => Promise<string[]>
  reset: (values?: T) => void
}

function createFormState<T extends Record<string, unknown>>(
  config: UseFormConfig<T>
) {
  let isSubmitting = false
  const subscribers = new Set<FormStateSubscriber<T>>()
  const state: T = { ...(config.initialValues ?? {}) } as T
  const validatorConfigs: Partial<
    Record<RecordKey<T>, FormFieldValidators<T[RecordKey<T>]>>
  > = {}
  const fieldUpdaters = new Map<RecordKey<T>, Set<() => void>>()
  let fieldMeta = {} as {
    [key in RecordKey<T>]: {
      onMount?: {
        error?: string
      }
      onChange?: {
        error?: string
      }
      onBlur?: {
        error?: string
      }
      onSubmit?: {
        error?: string
      }
      onChangeAsync?: {
        error?: string
        timeout: number
        epoch: number
      }
    }
  }

  const canSubmit = () => {
    const errors = getErrors()
    return errors.length === 0 && isAnyFieldValidating() === false
  }

  const getSelectorState = () => {
    return {
      values: state,
      canSubmit: canSubmit(),
      isSubmitting,
    }
  }

  const updateSubscribers = () => {
    const selectorState = getSelectorState()
    for (const sub of subscribers) {
      const { selector, selection, update } = sub
      const newSelection = selector(selectorState)
      if (shallowCompare(selection, newSelection)) continue
      sub.selection = newSelection
      update()
    }
  }

  const updateFieldComponents = (name: RecordKey<T>) => {
    if (!fieldUpdaters.has(name)) return
    for (const update of fieldUpdaters.get(name)!) update()
  }

  const validateField = (
    name: RecordKey<T>,
    evt: keyof Omit<
      FormFieldValidators<T[RecordKey<T>]>,
      "onChangeAsyncDebounceMs"
    >
  ) => {
    if (!fieldMeta[name]) {
      fieldMeta[name] = {}
    }
    switch (evt) {
      case "onMount": {
        const res = validatorConfigs[name]?.onMount?.({ value: state[name] })
        fieldMeta[name].onMount = {
          error: typeof res === "string" ? res : undefined,
        }
        console.log("validate onMount", name, res)
        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onChange": {
        if (fieldMeta[name].onMount) {
          delete fieldMeta[name].onMount
        }
        const res = validatorConfigs[name]?.onChange?.({ value: state[name] })
        fieldMeta[name].onChange = {
          error: typeof res === "string" ? res : undefined,
        }
        if (
          fieldMeta[name].onChangeAsync &&
          fieldMeta[name].onChangeAsync.timeout !== -1
        ) {
          window.clearTimeout(fieldMeta[name].onChangeAsync?.timeout)
          fieldMeta[name].onChangeAsync = {
            error: undefined,
            timeout: -1,
            epoch: fieldMeta[name].onChangeAsync.epoch,
          }
        }
        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onBlur": {
        const res = validatorConfigs[name]?.onBlur?.({ value: state[name] })
        fieldMeta[name].onBlur = {
          error: typeof res === "string" ? res : undefined,
        }
        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onChangeAsync": {
        if (fieldMeta[name].onChange?.error) {
          return
        }
        window.clearTimeout(fieldMeta[name].onChangeAsync?.timeout)
        const debounceMs = validatorConfigs[name]?.onChangeAsyncDebounceMs ?? 0
        const epoch = (fieldMeta[name].onChangeAsync?.epoch ?? 0) + 1
        const doValidation = () => {
          const res = validatorConfigs[name]?.onChangeAsync?.({
            value: state[name],
          })
          res?.then((error) => {
            if (epoch !== fieldMeta[name].onChangeAsync?.epoch) return
            fieldMeta[name].onChangeAsync = {
              error: typeof error === "string" ? error : undefined,
              timeout: -1,
              epoch,
            }
            updateSubscribers()
            updateFieldComponents(name)
          })
        }
        if (debounceMs > 0) {
          fieldMeta[name].onChangeAsync = {
            error: undefined,
            epoch,
            timeout: window.setTimeout(doValidation, debounceMs),
          }
        } else {
          fieldMeta[name].onChangeAsync = {
            error: undefined,
            epoch,
            timeout: -1,
          }
          doValidation()
        }
        updateSubscribers()
        updateFieldComponents(name)

        break
      }
      case "onSubmit": {
        const res = validatorConfigs[name]?.onBlur?.({ value: state[name] })
        fieldMeta[name].onSubmit = {
          error: typeof res === "string" ? res : undefined,
        }
      }
    }
  }

  const getFieldState = (name: RecordKey<T>) => {
    let errors: string[] = []
    let isValidating = false
    const meta = fieldMeta[name]
    if (meta) {
      if (meta.onChangeAsync && meta.onChangeAsync.timeout !== -1) {
        isValidating = true
      } else {
        errors.push(
          ...[
            meta.onChangeAsync?.error,
            meta.onMount?.error,
            meta.onChange?.error,
            meta.onBlur?.error,
          ].filter((v) => v !== undefined)
        )
      }
    }
    return {
      value: state[name],
      errors,
      isTouched: !!(meta?.onChange || meta?.onBlur),
      isValidating,
    }
  }

  const updateFieldValue = (name: RecordKey<T>, value: T[RecordKey<T>]) => {
    state[name] = value
    updateSubscribers()
  }

  const getErrors = () => {
    const errors: string[] = []
    for (const key in fieldMeta) {
      const valState = fieldMeta[key]
      if (valState.onMount?.error) {
        errors.push(valState.onMount.error)
      }
      if (valState.onChange?.error) {
        errors.push(valState.onChange.error)
      }
      if (valState.onChangeAsync?.error) {
        errors.push(valState.onChangeAsync.error)
      }
      if (valState.onBlur?.error) {
        errors.push(valState.onBlur.error)
      }
    }
    return errors
  }

  const isAnyFieldValidating = () => {
    for (const key in fieldMeta) {
      const valState = fieldMeta[key]
      if (valState.onChangeAsync && valState.onChangeAsync.timeout !== -1)
        return true
    }
    return false
  }

  const connectField = (name: RecordKey<T>, update: () => void) => {
    if (!fieldUpdaters.has(name)) {
      fieldUpdaters.set(name, new Set())
    }
    fieldUpdaters.get(name)!.add(update)
  }
  const disconnectField = (name: RecordKey<T>, update: () => void) => {
    if (!fieldUpdaters.has(name)) return
    fieldUpdaters.get(name)!.delete(update)
  }

  const reset = (values?: T) => {
    if (values) {
      for (const key in values) {
        state[key] = values[key]
      }
    } else {
      const keys = new Set([
        ...Object.keys(state),
        ...Object.keys(config.initialValues ?? {}),
      ])
      for (const key in keys) {
        if (config.initialValues?.[key]) {
          // @ts-ignore
          state[key as any as RecordKey<T>] = config.initialValues?.[key]
        } else {
          delete state[key]
        }
      }
    }
    fieldMeta = {} as any
    updateSubscribers()
    fieldUpdaters.forEach((updaters) => {
      updaters.forEach((update) => update())
    })
  }

  const validateForm = async () => {
    for (const name in validatorConfigs) {
      if (validatorConfigs[name]?.onChange) {
        validateField(name, "onChange")
      }
      if (validatorConfigs[name]?.onSubmit) {
        validateField(name, "onSubmit")
      }
      if (validatorConfigs[name]?.onChangeAsync) {
        const value = state[name] as T[RecordKey<T>]
        const epoch = (fieldMeta[name].onChangeAsync?.epoch ?? 0) + 1
        const res = await validatorConfigs[name].onChangeAsync({ value })
        fieldMeta[name].onChangeAsync = {
          error: typeof res === "string" ? res : undefined,
          epoch,
          timeout: -1,
        }
      }
    }
    return getErrors()
  }

  const deleteField = (name: RecordKey<T>) => {
    delete state[name]
    delete fieldMeta[name]
    updateSubscribers()
  }
  const resetField = (name: RecordKey<T>) => {
    if (config.initialValues?.[name]) {
      state[name] = config.initialValues[name]
    } else {
      delete state[name]
    }
    updateSubscribers()
  }
  const setFieldValue = (name: RecordKey<T>, value: T[RecordKey<T>]) => {
    state[name] = value
    updateSubscribers()
  }

  const getFormContext = (): FormContext<T> => {
    return {
      deleteField,
      resetField,
      setFieldValue,
      validateForm,
      state,
    }
  }

  return {
    subscribers,
    state,
    validatorConfigs,
    fieldMeta,
    validateField,
    getFieldState,
    updateFieldValue,
    connectField,
    disconnectField,
    getSelectorState,
    validateForm,
    reset,
    getFormContext,
  }
}

export function useForm<T extends Record<string, unknown> = {}>(
  config: UseFormConfig<T>
): UseFormReturn<T> {
  return useHook(
    "useForm",
    {} as UseFormInternalState<T>,
    ({ hook, isInit }) => {
      if (isInit) {
        const formState = createFormState(config)
        hook.validateForm = () => formState.validateForm()
        hook.reset = () => formState.reset()
        hook.getFormContext = () => formState.getFormContext()

        hook.Field = function Field<Name extends RecordKey<T>>(
          props: FormFieldProps<T, Name>
        ) {
          const update = useRequestUpdate()
          useEffect(() => {
            formState.validatorConfigs[props.name] = props.validators as any
            formState.connectField(props.name, update)
            if (props.validators?.onMount) {
              formState.validateField(props.name, "onMount")
            }
            return () => {
              formState.disconnectField(props.name, update)
            }
          }, [])

          return props.children({
            name: props.name,
            state: formState.getFieldState(props.name) as any,
            handleChange: (value: T[Name]) => {
              formState.updateFieldValue(props.name, value)
              formState.validateField(props.name, "onChange")
              if (props.validators?.onChangeAsync) {
                formState.validateField(props.name, "onChangeAsync")
              }
            },
            handleBlur: () => {
              formState.validateField(props.name, "onBlur")
            },
          })
        }
        hook.Subscribe = function Subscribe<
          Selector extends (state: SelectorState<T>) => unknown
        >(props: FormSubscribeProps<T, Selector, ReturnType<Selector>>) {
          const selection = useHook(
            "useFormSubscription",
            { sub: null! as FormStateSubscriber<T> },
            ({ hook, isInit, update }) => {
              if (isInit) {
                hook.sub = {
                  selector: props.selector,
                  selection: props.selector(formState.getSelectorState()),
                  update,
                }
                formState.subscribers.add(hook.sub)
                hook.cleanup = () => formState.subscribers.delete(hook.sub)
              }
              return hook.sub.selection
            }
          ) as ReturnType<Selector>
          return props.children(selection)
        }
      }
      return {
        Field: hook.Field,
        Subscribe: hook.Subscribe,
        handleSubmit: async () => {
          const errors = await hook.validateForm()
          const formCtx = hook.getFormContext()
          if (errors.length) return config.onSubmitInvalid?.(formCtx)
          await config.onSubmit?.(formCtx)
        },
        reset: (values?: T) => hook.reset(values),
      } satisfies UseFormReturn<T>
    }
  )
}
