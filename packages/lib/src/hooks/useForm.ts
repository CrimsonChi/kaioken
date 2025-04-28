import { Fragment } from "../element.js"
import { generateRandomID } from "../generateId.js"
import { shallowCompare } from "../utils.js"
import { useEffect } from "./useEffect.js"
import { useMemo } from "./useMemo.js"
import { useHook, useRequestUpdate } from "./utils.js"

const objSet = (obj: Record<string, any>, path: string[], value: any) => {
  let o = obj
  for (let i = 0; i < path.length; i++) {
    const key = path[i]
    if (i === path.length - 1) {
      o[key] = value
    } else {
      o = o[key]
    }
  }
}

const objGet = <T>(obj: Record<string, any>, path: string[]): T => {
  return path.reduce((o, key) => o[key], obj) as T
}

type ObjectValuesArray<T extends object> = T[keyof T][]

type IsObject<T> = T extends object ? (T extends any[] ? false : true) : false

type InferKeyWithIndices<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends Array<infer U> | undefined
    ? IsObject<U> extends true
      ? // If it's an array of objects, infer the index and recurse into the object properties
        | `${Prefix}${K}`
          | `${Prefix}${K}.${number}`
          | InferKeyWithIndices<U, `${Prefix}${K}.${number}.`>
      : `${Prefix}${K}` | `${Prefix}${K}.${number}` // For arrays of primitives, only support indices
    : IsObject<T[K]> extends true
    ? // If it's an object, recurse into its properties
      `${Prefix}${K}` | InferKeyWithIndices<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}` // If it's a primitive, return the key
}[keyof T & string]

type RecordKey<T extends Record<string, unknown>> = InferKeyWithIndices<T>

type InferValue<
  T,
  Path extends string
> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? InferValue<T[K], Rest> // Recursively resolve objects
    : K extends `${number}` // Check if it's a numeric index for an array
    ? T extends Array<infer U> | undefined
      ? InferValue<U, Rest> // Recursively resolve array elements
      : never
    : never
  : Path extends keyof T
  ? T[Path] // Direct lookup for simple keys
  : Path extends `${number}` // If the path is numeric (array index)
  ? T extends Array<infer U> | undefined
    ? U // Resolve the array element type
    : never
  : never

type InferRecordKeyValue<
  T extends Record<string, unknown>,
  K extends RecordKey<T>
> = InferValue<T, K>

type ValidatorContext<T> = {
  value: T
}

type FormFieldValidator<T extends unknown> = (
  context: ValidatorContext<T>
) => any

type AsyncValidatorContext<T> = {
  value: T
  abortSignal: AbortSignal
}

type AsyncFormFieldValidator<T extends unknown> = (
  context: AsyncValidatorContext<T>
) => Promise<any>

type FormFieldValidators<RecordKey extends string, Value> = {
  dependentOn?: RecordKey[]
  onBlur?: FormFieldValidator<Value>
  onChange?: FormFieldValidator<Value>
  onChangeAsyncDebounceMs?: number
  onChangeAsync?: AsyncFormFieldValidator<Value>
  onMount?: FormFieldValidator<Value>
  onSubmit?: FormFieldValidator<Value>
}

type Falsy = false | null | undefined

type InferValidatorReturn<T> = T extends Falsy
  ? never
  : T extends Promise<infer U>
  ? InferValidatorReturn<U>
  : T

type InferFormFieldErrors<
  RecordKey extends string,
  T extends FormFieldValidators<RecordKey, any>
> = ObjectValuesArray<{
  [K in keyof T]: T[K] extends FormFieldValidator<any>
    ? InferValidatorReturn<ReturnType<T[K]>>
    : never
}>

export type FormFieldContext<
  T extends Record<string, unknown>,
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<
    RecordKey<T>,
    InferRecordKeyValue<T, Name>
  >,
  IsArray extends Boolean
> = {
  name: Name
  state: {
    value: InferRecordKeyValue<T, Name>
    errors: InferFormFieldErrors<RecordKey<T>, Validators>
    isTouched: boolean
    isValidating: boolean
  }
  handleChange: (value: InferRecordKeyValue<T, Name>) => void
  handleBlur: () => void
} & (IsArray extends true
  ? {
      items: {
        replace: (
          index: number,
          value: InferRecordKeyValue<T, Name> extends Array<infer U> ? U : any
        ) => void
        push: (
          value: InferRecordKeyValue<T, Name> extends Array<infer U> ? U : any
        ) => void
        remove: (index: number) => void
      }
    }
  : {})

export type AnyFormFieldContext<
  T extends Record<string, any> = Record<string, any>
> = FormFieldContext<T, any, any, any>

interface FormFieldProps<
  T extends Record<string, unknown>,
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<
    RecordKey<T>,
    InferRecordKeyValue<T, Name>
  >,
  IsArray extends boolean
> {
  name: Name
  validators?: Validators

  array?: IsArray
  children: (
    context: FormFieldContext<T, Name, Validators, IsArray>
  ) => JSX.Element
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

type FormFieldState<T extends Record<string, any>, K extends RecordKey<T>> = {
  value: InferRecordKeyValue<T, K>
  errors: InferFormFieldErrors<
    K,
    FormFieldValidators<K, InferRecordKeyValue<T, K>>
  >
  isTouched: boolean
  isValidating: boolean
}

type FormFieldComponent<T extends Record<string, unknown>> = <
  Name extends RecordKey<T>,
  Validators extends FormFieldValidators<
    RecordKey<T>,
    InferRecordKeyValue<T, Name>
  >,
  IsArray extends boolean
>(
  props: Prettify<FormFieldProps<T, Name, Validators, IsArray>>
) => JSX.Element

type FormSubscribeComponent<T extends Record<string, unknown>> = <
  Selector extends (state: SelectorState<T>) => unknown
>(
  props: FormSubscribeProps<T, Selector, ReturnType<Selector>>
) => JSX.Element

type UseFormReturn<T extends Record<string, unknown>> = {
  Field: FormFieldComponent<T>
  Subscribe: FormSubscribeComponent<T>
  getFieldState: <K extends RecordKey<T>>(name: K) => FormFieldState<T, K>
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
  Field: FormFieldComponent<T>
  Subscribe: FormSubscribeComponent<T>
  formController: FormController<T>
}

type FormController<T extends Record<string, unknown>> = {
  subscribers: Set<FormStateSubscriber<T>>
  state: T
  formFieldValidators: FormFieldValidators<
    RecordKey<T>,
    InferRecordKeyValue<T, RecordKey<T>>
  >
  validateField: (
    name: RecordKey<T>,
    type: "onChange" | "onSubmit" | "onMount" | "onBlur"
  ) => Promise<void>
  getFieldState: <K extends RecordKey<T>>(name: K) => FormFieldState<T, K>
  updateFieldValue: (
    name: RecordKey<T>,
    value: InferRecordKeyValue<T, RecordKey<T>>
  ) => void
  arrayFieldReplace: <K extends RecordKey<T>>(
    name: K,
    index: number,
    value: InferRecordKeyValue<T, K> extends Array<infer U> ? U : any
  ) => void
  arrayFieldPush: <K extends RecordKey<T>>(
    name: K,
    value: InferRecordKeyValue<T, K> extends Array<infer U> ? U : any
  ) => void
  arrayFieldRemove: (name: RecordKey<T>, index: number) => void
  connectField: (name: RecordKey<T>, update: () => void) => void
  disconnectField: (name: RecordKey<T>, update: () => void) => void
  getSelectorState: () => any
  validateForm: () => Promise<string[]>
  getFormContext: () => FormContext<T>
  reset: (values?: T) => void
}

function createFormController<T extends Record<string, unknown>>(
  config: UseFormConfig<T>
): FormController<T> {
  let isSubmitting = false
  const subscribers = new Set<FormStateSubscriber<T>>()
  const state: T = { ...(config.initialValues ?? {}) } as T
  const formFieldValidators = {} as {
    [key in RecordKey<T>]: FormFieldValidators<
      RecordKey<T>,
      InferRecordKeyValue<T, key>
    >
  }
  const formFieldsTouched = {} as {
    [key in RecordKey<T>]?: boolean
  }
  const formFieldUpdaters = new Map<RecordKey<T>, Set<() => void>>()
  const asyncFormFieldValidators = {} as {
    [key in RecordKey<T>]: {
      onChangeAsync?: {
        timeout: number
        epoch: number
        abortController: AbortController | null
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

  const validateField = async <K extends RecordKey<T>>(
    name: K,
    evt: keyof Omit<
      FormFieldValidators<RecordKey<T>, InferRecordKeyValue<T, K>>,
      "onChangeAsyncDebounceMs"
    >
  ) => {
    const fieldErrors = (formFieldErrors[name] ??= {})
    const asyncFieldValidatorStates = (asyncFormFieldValidators[name] ??= {})
    const fieldValidators = formFieldValidators[name] ?? {}

    const validatorCtx = { value: getFieldValue(name) }

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
        formFieldsTouched[name] = true
        if (!fieldValidators.onChange) return

        fieldErrors.onChange = fieldValidators.onChange(validatorCtx)

        if (
          asyncFieldValidatorStates.onChangeAsync &&
          asyncFieldValidatorStates.onChangeAsync.timeout !== -1
        ) {
          window.clearTimeout(asyncFieldValidatorStates.onChangeAsync.timeout)
          asyncFieldValidatorStates.onChangeAsync.abortController?.abort()

          asyncFieldValidatorStates.onChangeAsync = {
            epoch: asyncFieldValidatorStates.onChangeAsync.epoch,
            timeout: -1,
            abortController: null,
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
        formFieldsTouched[name] = true
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

        const abortController = new AbortController()
        const asyncValidatorCtx: AsyncValidatorContext<any> = {
          ...validatorCtx,
          abortSignal: abortController.signal,
        }

        if (debounceMs <= 0) {
          fieldErrors.onChangeAsync = await fieldValidators.onChangeAsync(
            asyncValidatorCtx
          )
          updateSubscribers()
          updateFieldComponents(name)
          return
        }
        asyncFieldValidatorStates.onChangeAsync = {
          abortController,
          timeout: window.setTimeout(() => {
            fieldValidators
              .onChangeAsync?.(asyncValidatorCtx)
              .then((result) => {
                if (fieldErrors.onChange) return
                if (epoch !== asyncFieldValidatorStates.onChangeAsync?.epoch) {
                  return
                }
                fieldErrors.onChangeAsync = result
                asyncFieldValidatorStates.onChangeAsync = {
                  timeout: -1,
                  epoch,
                  abortController,
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

  const getFieldState = <K extends RecordKey<T>>(
    name: K
  ): FormFieldState<T, K> => {
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
      value: getFieldValue(name),
      errors,
      isTouched: !!formFieldsTouched[name],
      isValidating,
    }
  }

  const validateFieldOnChange = (name: RecordKey<T>) => {
    validateField(name, "onChange")
    if (formFieldValidators[name]?.onChangeAsync) {
      validateField(name, "onChangeAsync")
    }
  }

  const getFieldValue = <K extends RecordKey<T>>(
    name: K
  ): InferRecordKeyValue<T, K> => {
    return objGet(state, (name as string).split(".")) as InferRecordKeyValue<
      T,
      K
    >
  }

  const updateFieldValue = <K extends RecordKey<T>>(
    name: K,
    value: InferRecordKeyValue<T, K>
  ) => {
    objSet(state, (name as string).split("."), value)

    validateFieldOnChange(name)
  }

  const arrayFieldReplace = (name: RecordKey<T>, index: number, value: any) => {
    const path = [...(name as string).split("."), index.toString()]
    objSet(state, path, value)

    delete formFieldErrors[name]
    delete asyncFormFieldValidators[name]
    delete formFieldsTouched[name]
    delete formFieldValidators[name]
    formFieldUpdaters.delete(name)

    validateFieldOnChange(name)
    updateFieldComponents(name)
  }

  const arrayFieldPush = (name: RecordKey<T>, value: any) => {
    const path = [...(name as string).split(".")]
    const arr = objGet<any[]>(state, path)
    arr.push(value)

    validateFieldOnChange(name)
    updateFieldComponents(name)
  }

  const arrayFieldRemove = (name: RecordKey<T>, index: number) => {
    const path = [...(name as string).split(".")]
    const arr = objGet<any[]>(state, path)
    arr.splice(index, 1)

    validateFieldOnChange(name)
    updateFieldComponents(name)
  }

  const getErrors = () => {
    const errors: string[] = []
    for (const fieldName in formFieldErrors) {
      const meta = formFieldErrors[fieldName as RecordKey<T>]
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
      const fieldValidators =
        asyncFormFieldValidators[fieldName as RecordKey<T>]
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

    const asyncValidators = asyncFormFieldValidators[name] ?? {}
    const { abortController, timeout } = asyncValidators.onChangeAsync ?? {}
    window.clearTimeout(timeout)
    abortController?.abort()
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
          state[key as RecordKey<T>] = config.initialValues?.[
            key
          ] as T[RecordKey<T>]
        } else {
          delete state[key]
        }
      }
    }
    for (const fieldName in formFieldsTouched) {
      delete formFieldsTouched[fieldName as RecordKey<T>]
    }
    for (const fieldName in asyncFormFieldValidators) {
      const asyncFieldValidators =
        asyncFormFieldValidators[fieldName as RecordKey<T>]
      const { timeout, abortController } =
        asyncFieldValidators?.onChangeAsync ?? {}
      if (timeout !== -1) {
        window.clearTimeout(timeout)
      }
      abortController?.abort()
      delete asyncFormFieldValidators[fieldName as RecordKey<T>]
    }
    for (const fieldName in formFieldErrors) {
      delete formFieldErrors[fieldName as RecordKey<T>]
    }
    updateSubscribers()
    formFieldUpdaters.forEach((updaters) => {
      updaters.forEach((update) => update())
    })
  }

  const validateForm = async () => {
    for (const fieldName in formFieldValidators) {
      const fieldValidators = formFieldValidators[fieldName as RecordKey<T>]
      if (fieldValidators?.onChange) {
        await validateField(fieldName as RecordKey<T>, "onChange")
      }
      if (fieldValidators?.onSubmit) {
        await validateField(fieldName as RecordKey<T>, "onSubmit")
      }
      if (
        !formFieldErrors[fieldName as RecordKey<T>]?.onChange &&
        fieldValidators?.onChangeAsync
      ) {
        const value = state[fieldName] as T[RecordKey<T>]
        const abortController = new AbortController()
        const asyncValidators = (asyncFormFieldValidators[
          fieldName as RecordKey<T>
        ] ??= {})
        const epoch = asyncValidators.onChangeAsync?.epoch ?? 0
        asyncValidators.onChangeAsync = {
          timeout: 0,
          epoch,
          abortController,
        }
        const ctx: AsyncValidatorContext<any> = {
          value,
          abortSignal: abortController.signal,
        }
        formFieldErrors[fieldName as RecordKey<T>].onChangeAsync =
          await fieldValidators.onChangeAsync(ctx)
        asyncValidators.onChangeAsync = {
          timeout: -1,
          epoch,
          abortController: null,
        }
        updateFieldComponents(fieldName as RecordKey<T>)
        updateSubscribers()
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
    validateField,
    getFieldState,
    updateFieldValue,
    arrayFieldReplace,
    arrayFieldPush,
    arrayFieldRemove,
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
        const $controller = (hook.formController = createFormController(config))

        hook.Field = function Field<
          Name extends RecordKey<T>,
          Validators extends FormFieldValidators<
            RecordKey<T>,
            InferRecordKeyValue<T, Name>
          >,
          IsArray extends boolean
        >(props: FormFieldProps<T, Name, Validators, IsArray>) {
          const update = useRequestUpdate()
          if (props.validators) {
            // @ts-ignore TODO: simplify types?
            $controller.formFieldValidators[props.name] =
              props.validators as any
          }
          useEffect(() => {
            $controller.connectField(props.name, update)
            if (props.validators?.onMount) {
              $controller.validateField(props.name, "onMount")
            }
            return () => {
              $controller.disconnectField(props.name, update)
            }
          }, [])

          const fieldState = $controller.getFieldState(props.name)

          const childProps: FormFieldContext<T, Name, Validators, false> = {
            name: props.name,
            state: fieldState as FormFieldContext<
              T,
              Name,
              Validators,
              false
            >["state"],
            handleChange: (value: InferRecordKeyValue<T, Name>) => {
              $controller.updateFieldValue(props.name, value)
            },
            handleBlur: () => {
              $controller.validateField(props.name, "onBlur")
            },
          }

          if (props.array) {
            const asArrayProps = childProps as FormFieldContext<
              T,
              Name,
              Validators,
              true
            >
            asArrayProps.items = {
              replace: (index: number, value: any) => {
                $controller.arrayFieldReplace(props.name, index, value)
              },
              push: (value: any) => {
                $controller.arrayFieldPush(props.name, value)
              },
              remove: (index: number) => {
                $controller.arrayFieldRemove(props.name, index)
              },
            }
          }
          return Fragment({
            key: useMemo(generateRandomID, []),
            children: props.children(
              childProps as FormFieldContext<T, Name, Validators, IsArray>
            ),
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
                  selection: props.selector($controller.getSelectorState()),
                  update,
                }
                $controller.subscribers.add(hook.sub)
                hook.cleanup = () => $controller.subscribers.delete(hook.sub)
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
          const errors = await hook.formController.validateForm()
          const formCtx = hook.formController.getFormContext()
          if (errors.length) return config.onSubmitInvalid?.(formCtx)
          await config.onSubmit?.(formCtx)
        },
        reset: (values?: T) => hook.formController.reset(values),
        getFieldState: <K extends RecordKey<T>>(name: K) =>
          hook.formController.getFieldState(name),
      } satisfies UseFormReturn<T>
    }
  )
}
