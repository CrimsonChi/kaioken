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
  onChange?: (value: string) => void
}

export function Select(
  props: SelectProps & Omit<ElementProps<"select">, "onchange">
) {
  const { className, value, onChange, options, ...rest } = props

  return (
    <select
      className={"p-2 " + className || ""}
      onchange={(e) => onChange?.(e.target.value)}
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
