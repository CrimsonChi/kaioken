import { ElementProps } from "kaioken"

type Key = string | number

type SelectOption =
  | {
      key: Key
      text: string
    }
  | string

interface SelectProps {
  value?: string
  options: SelectOption[]
  onchange?: (value: string) => void
}

export function Select(
  props: SelectProps & Omit<ElementProps<"select">, "onchange">
) {
  const { className, value, onchange, options, ...rest } = props
  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement
    onchange?.(target.value)
  }

  return (
    <select
      className={"p-2 " + className || ""}
      onchange={handleChange}
      {...rest}
    >
      {props.options.map((item) => {
        const key = typeof item === "object" ? String(item.key) : item
        return (
          <option value={key} selected={value?.toString() === key}>
            {typeof item === "object" ? item.text : item}
          </option>
        )
      })}
    </select>
  )
}
