import { createContext, useReducer } from "kaioken"

export const ThemeContext = createContext<"dark" | "light">(null)
export const ThemeDispatchContext =
  createContext<(action: { type: "toggle" }) => void>(null)

export function themeReducer(
  state: "dark" | "light",
  action: { type: "toggle" }
) {
  switch (action.type) {
    case "toggle": {
      return state === "dark" ? "light" : "dark"
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export function ThemeContextProvider({ children }: { children?: JSX.Element }) {
  const [theme, dispatch] = useReducer(themeReducer, "dark")
  return (
    <ThemeContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={dispatch}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeContext.Provider>
  )
}
