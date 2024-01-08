import { StyleScope, useContext, useEffect, useState } from "reflex-ui"
import { ThemeContext } from "../ThemeContext"

export function Counter() {
  const [count, setCount] = useState(0)
  const theme = useContext(ThemeContext)

  useEffect(() => {
    console.log("count", count)
    return () => {
      console.log("cleanup", count)
    }
  }, [count])

  const handleClick = () => {
    setCount((prev) => prev + 1)
  }

  return (
    <div>
      <StyleScope>
        <div>
          Counter <>{count}</>
          <button onclick={handleClick}>+</button>
        </div>

        <style>
          {`
        div {
          display: flex;
          align-items: center;
        }
        button {
          margin-left: 1rem;
          color: ${theme === "dark" ? "#ddd" : "#222"};
          background-color: ${theme === "dark" ? "#222" : "#ddd"};
        }
      `}
        </style>
      </StyleScope>
    </div>
  )
}
