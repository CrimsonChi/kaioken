import { StyleScope, useContext, type ElementProps } from "kaioken"
import { ThemeContext } from "../ThemeContext"

export function Button(props: ElementProps<"button">) {
  const theme = useContext(ThemeContext)
  return (
    <StyleScope>
      <button id="123" {...props}>
        {props.children}
      </button>
      <style>
        {`
        button {
          color: ${theme === "dark" ? "#ddd" : "#222"};
          background-color: ${theme === "dark" ? "#222" : "#ddd"};
        }
      `}
      </style>
    </StyleScope>
  )
}
