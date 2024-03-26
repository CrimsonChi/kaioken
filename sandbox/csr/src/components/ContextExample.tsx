import { createContext, useContext, useState } from "kaioken"

const ThemeContext = createContext<"light" | "dark">("dark")
const ThemeContextDispatcher = createContext<null | (() => void)>(null)

export function ContextExample() {
  const [themeA, setThemeA] = useState<"light" | "dark">("light")
  const [themeB, setThemeB] = useState<"light" | "dark">("light")
  return (
    <div className="flex flex-col gap-2">
      <ThemeContext.Provider value={themeA}>
        <ThemeContextDispatcher.Provider
          value={() => setThemeA(themeA === "light" ? "dark" : "light")}
        >
          <ThemeButton />
        </ThemeContextDispatcher.Provider>
      </ThemeContext.Provider>
      <br />
      <ThemeContext.Provider value={themeB}>
        <ThemeContextDispatcher.Provider
          value={() => setThemeB(themeB === "light" ? "dark" : "light")}
        >
          <ThemeButton />
        </ThemeContextDispatcher.Provider>
      </ThemeContext.Provider>
    </div>
  )
}

function ThemeButton() {
  const theme = useContext(ThemeContext)
  const dispatch = useContext(ThemeContextDispatcher)
  return <button onclick={() => dispatch?.()}>{theme}</button>
}
