import { createContext } from "reflex-ui"

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
