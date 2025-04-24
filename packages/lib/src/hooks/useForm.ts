import { shallowCompare } from "../utils.js"
import { useEffect } from "./useEffect.js"
import { useHook, useRequestUpdate } from "./utils.js"

type RecordKey<T extends Record<string, unknown>> = keyof T & string

type FormFieldValidator<T extends unknown> = ({ value }: { value: T }) => any

type AsyncFormFieldValidator<T extends unknown> = ({
  value,
}: {
  value: T
}) => Promise<any>

type FormFieldValidators<T> = {
  onBlur?: FormFieldValidator<T>
  onChange?: FormFieldValidator<T>
  onChangeAsyncDebounceMs?: number
  onChangeAsync?: AsyncFormFieldValidator<T>
  onMount?: FormFieldValidator<T>
  onSubmit?: FormFieldValidator<T>
}

type InferValidatorReturn<T> = T extends undefined
  ? never
  : T extends null
  ? never
  : T extends Promise<infer U>
  ? InferValidatorReturn<U>
  : T extends boolean
  ? never
  : T

// create a type that produces an array of error returns from FormFieldValidators
type ObjectValuesArray<T extends object> = T[keyof T][]

type InferFormFieldErrors<T extends FormFieldValidators<any>> =
  ObjectValuesArray<{
    [K in keyof T]: T[K] extends FormFieldValidator<any>
      ? InferValidatorReturn<ReturnType<T[K]>>
      : never
  }>

export type FormFieldContext<
  T extends Record<string, unknown>,
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<T[Name]>
> = {
  name: Name
  state: {
    value: T[Name]
    errors: InferFormFieldErrors<Validators>
    isTouched: boolean
    isValidating: boolean
  }
  handleChange: (value: T[Name]) => void
  handleBlur: () => void
}
export type AnyFormFieldContext = FormFieldContext<any, any, any>

interface FormFieldProps<
  T extends Record<string, unknown>,
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<T[Name]>
> {
  name: Name
  validators?: Validators
  children: (context: FormFieldContext<T, Name, Validators>) => JSX.Element
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

type Prettify<T> = {
  [K in keyof T]: T[K]
}

type FieldComponent<T extends Record<string, unknown>> = <
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<T[Name]>
>(
  props: Prettify<FormFieldProps<T, Name, Validators>>
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
  validateForm: () => Promise<any[]>
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
  validateForm: () => Promise<any[]>
  reset: (values?: T) => void
}

function createFormState<T extends Record<string, unknown>>(
  config: UseFormConfig<T>
) {
  let isSubmitting = false
  const subscribers = new Set<FormStateSubscriber<T>>()
  const state: T = { ...(config.initialValues ?? {}) } as T
  const formFieldValidators = {} as {
    [key in RecordKey<T>]: FormFieldValidators<T[key]>
  }
  const formFieldsMeta = {} as {
    [key in RecordKey<T>]: {
      isTouched: boolean
    }
  }
  const formFieldUpdaters = new Map<RecordKey<T>, Set<() => void>>()
  const asyncFormFieldValidators = {} as {
    [key in RecordKey<T>]: {
      onChangeAsync?: {
        timeout: number
        epoch: number
      }
    }
  }
  const formFieldErrors = {} as {
    [key in RecordKey<T>]: {
      onMount?: any
      onChange?: any
      onBlur?: any
      onSubmit?: any
      onChangeAsync?: any
    }
  }

  const canSubmit = () => {
    return isAnyFieldValidating() === false && getErrors().length === 0
  }

  const getSelectorState = (): SelectorState<T> => {
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
    if (!formFieldUpdaters.has(name)) return
    for (const update of formFieldUpdaters.get(name)!) update()
  }

  const validateField = async (
    name: RecordKey<T>,
    evt: keyof Omit<
      FormFieldValidators<T[RecordKey<T>]>,
      "onChangeAsyncDebounceMs"
    >
  ) => {
    const fieldErrors = (formFieldErrors[name] ??= {})
    const asyncFieldValidatorStates = (asyncFormFieldValidators[name] ??= {})
    const fieldValidators = formFieldValidators[name] ?? {}

    const validatorCtx = { value: state[name] }

    switch (evt) {
      case "onMount": {
        if (!fieldValidators.onMount) return

        fieldErrors.onMount = fieldValidators.onMount(validatorCtx)
        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onChange": {
        if (fieldErrors.onMount) delete fieldErrors.onMount
        if (!formFieldsMeta[name]) {
          formFieldsMeta[name] = { isTouched: true }
        }
        if (!fieldValidators.onChange) return

        fieldErrors.onChange = fieldValidators.onChange(validatorCtx)

        if (
          asyncFieldValidatorStates.onChangeAsync &&
          asyncFieldValidatorStates.onChangeAsync.timeout !== -1
        ) {
          window.clearTimeout(asyncFieldValidatorStates.onChangeAsync.timeout)
          asyncFieldValidatorStates.onChangeAsync = {
            epoch: asyncFieldValidatorStates.onChangeAsync.epoch,
            timeout: -1,
          }
          delete fieldErrors.onChangeAsync
        } else if (fieldErrors.onChangeAsync) {
          delete fieldErrors.onChangeAsync
        }

        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onBlur": {
        if (!fieldValidators.onBlur) return
        fieldErrors.onBlur = fieldValidators.onBlur(validatorCtx)
        updateSubscribers()
        updateFieldComponents(name)
        break
      }
      case "onChangeAsync": {
        if (fieldErrors.onChange || !fieldValidators.onChangeAsync) return

        window.clearTimeout(asyncFieldValidatorStates.onChangeAsync?.timeout)

        const epoch = (asyncFieldValidatorStates.onChangeAsync?.epoch ?? 0) + 1
        const debounceMs = fieldValidators.onChangeAsyncDebounceMs ?? 0

        if (debounceMs <= 0) {
          fieldErrors.onChangeAsync = await fieldValidators.onChangeAsync(
            validatorCtx
          )
          updateSubscribers()
          updateFieldComponents(name)
          return
        }

        asyncFieldValidatorStates.onChangeAsync = {
          timeout: window.setTimeout(() => {
            fieldValidators.onChangeAsync?.(validatorCtx).then((result) => {
              if (fieldErrors.onChange) return
              if (epoch !== asyncFieldValidatorStates.onChangeAsync?.epoch) {
                return
              }
              fieldErrors.onChangeAsync = result
              asyncFieldValidatorStates.onChangeAsync = {
                timeout: -1,
                epoch,
              }
              updateSubscribers()
              updateFieldComponents(name)
            })
          }, debounceMs),
          epoch,
        }
        updateSubscribers()
        break
      }
      case "onSubmit": {
        fieldErrors.onSubmit = fieldValidators.onSubmit?.(validatorCtx)
      }
    }
  }

  const getFieldState = (name: RecordKey<T>) => {
    let errors: any[] = []
    let isValidating = false
    const fieldErrors = formFieldErrors[name] ?? {}
    const asyncMeta = asyncFormFieldValidators[name] ?? {}
    if (asyncMeta.onChangeAsync && asyncMeta.onChangeAsync.timeout !== -1) {
      isValidating = true
    }

    if (!isValidating) {
      errors.push(
        ...[
          fieldErrors.onChangeAsync,
          fieldErrors.onMount,
          fieldErrors.onChange,
          fieldErrors.onBlur,
        ].filter(Boolean)
      )
    }

    return {
      value: state[name],
      errors,
      isTouched: !!formFieldsMeta[name]?.isTouched,
      isValidating,
    }
  }

  const updateFieldValue = (name: RecordKey<T>, value: T[RecordKey<T>]) => {
    state[name] = value
    updateSubscribers()
  }

  const getErrors = () => {
    const errors: string[] = []
    for (const key in formFieldErrors) {
      const meta = formFieldErrors[key]
      errors.push(
        ...[
          meta.onChangeAsync,
          meta.onMount,
          meta.onChange,
          meta.onBlur,
        ].filter(Boolean)
      )
    }
    return errors
  }

  const isAnyFieldValidating = () => {
    for (const fieldName in asyncFormFieldValidators) {
      const fieldValidators = asyncFormFieldValidators[fieldName]
      if (
        fieldValidators.onChangeAsync &&
        fieldValidators.onChangeAsync.timeout !== -1
      ) {
        return true
      }
    }
    return false
  }

  const connectField = (name: RecordKey<T>, update: () => void) => {
    if (!formFieldUpdaters.has(name)) {
      formFieldUpdaters.set(name, new Set())
    }
    formFieldUpdaters.get(name)!.add(update)
  }
  const disconnectField = (name: RecordKey<T>, update: () => void) => {
    if (!formFieldUpdaters.has(name)) return
    formFieldUpdaters.get(name)!.delete(update)
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
    for (const fieldName in asyncFormFieldValidators) {
      if (asyncFormFieldValidators[fieldName].onChangeAsync?.timeout !== -1) {
        window.clearTimeout(
          asyncFormFieldValidators[fieldName].onChangeAsync?.timeout
        )
      }
      delete asyncFormFieldValidators[fieldName]
    }
    for (const fieldName in formFieldErrors) {
      delete formFieldErrors[fieldName]
    }
    updateSubscribers()
    formFieldUpdaters.forEach((updaters) => {
      updaters.forEach((update) => update())
    })
  }

  const validateForm = async () => {
    for (const name in formFieldValidators) {
      const fieldValidators = formFieldValidators[name]
      if (fieldValidators?.onChange) {
        validateField(name, "onChange")
      }
      if (fieldValidators?.onSubmit) {
        validateField(name, "onSubmit")
      }
      if (fieldValidators?.onChangeAsync) {
        const value = state[name] as T[RecordKey<T>]
        formFieldErrors[name].onChangeAsync =
          await fieldValidators.onChangeAsync({ value })
      }
    }
    return getErrors()
  }

  const deleteField = (name: RecordKey<T>) => {
    delete state[name]
    delete formFieldErrors[name]
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
    formFieldValidators,
    formFieldErrors,
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

        hook.Field = function Field<
          Name extends RecordKey<T>,
          Validators extends FormFieldValidators<T[Name]>
        >(props: FormFieldProps<T, Name, Validators>) {
          const update = useRequestUpdate()
          if (props.validators) {
            formState.formFieldValidators[props.name] = props.validators
          }
          useEffect(() => {
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
