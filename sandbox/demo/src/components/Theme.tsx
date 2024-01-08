import { StyleScope, useContext } from "reflex-ui"
import { ThemeContext, ThemeDispatchContext } from "../context"

export function Theme() {
  const theme = useContext(ThemeContext)
  const dispatch = useContext(ThemeDispatchContext)

  const handleClick = () => {
    dispatch({ type: "toggle" })
  }

  return (
    <article>
      <StyleScope>
        <div>
          <button onclick={handleClick}>Toggle theme</button>
          <p>Current theme: {theme}</p>
        </div>
        <style>
          {`
        button {
          margin-left: 1rem;
          color: ${theme === "dark" ? "#ddd" : "#222"};
          background-color: ${theme === "dark" ? "#222" : "#ddd"};
        }
      `}
        </style>
      </StyleScope>
    </article>
  )
}
