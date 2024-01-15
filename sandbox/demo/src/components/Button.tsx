import { StyleScope, useContext, type ElementProps } from "kaioken"
import { ThemeContext } from "../ThemeContext"

export function Button(props: ElementProps<"button">) {
  const { darkMode } = useContext(ThemeContext)
  return (
    <StyleScope>
      <button {...props}>{props.children}</button>
      <style>
        {`
        button {
          color: ${darkMode ? "#ddd" : "#222"};
          background-color: ${darkMode ? "#222" : "#ddd"};
        }
      `}
      </style>
    </StyleScope>
  )
}
