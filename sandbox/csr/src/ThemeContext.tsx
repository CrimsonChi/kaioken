import { createContext, useReducer } from "kaioken"
interface Theme {
  darkMode: boolean
}

export const ThemeContext = createContext<Theme>(null)
export const ThemeDispatchContext =
  createContext<(action: { type: "toggle" }) => void>(null)

export function themeReducer(state: Theme, action: { type: "toggle" }): Theme {
  switch (action.type) {
    case "toggle": {
      return {
        ...state,
        darkMode: !state.darkMode,
      }
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export function ThemeContextProvider({ children }: { children?: JSX.Element }) {
  const [theme, dispatch] = useReducer(themeReducer, {
    darkMode: true,
  } as Theme)
  return (
    <ThemeContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={dispatch}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeContext.Provider>
  )
}
