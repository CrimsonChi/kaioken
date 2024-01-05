import { Router, Route, Link, useReducer } from "reflex-ui"
import { Todos } from "./components/ToDos"
import { ThemeContext, ThemeDispatchContext, themeReducer } from "./context"
import { Counter } from "./components/Counter"
import { Theme } from "./components/Theme"

function ThemeContextProvider({ children }: { children?: any }) {
  const [theme, dispatch] = useReducer(themeReducer, "dark")
  return (
    <ThemeContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={dispatch}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeContext.Provider>
  )
}

export const App = () => {
  return (
    <ThemeContextProvider>
      <h1>App</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/todos">Todos</Link>
        <Link to="/counter">Counter</Link>
        <Link to="/theme">Theme</Link>
      </nav>
      <Router>
        <Route path="/" element={() => <h2>Home</h2>} />
        <Route path="/about" element={() => <h2>About</h2>} />
        <Route path="/todos" element={Todos} />
        <Route path="/counter" element={Counter} />
        <Route path="/theme" element={Theme} />
      </Router>
    </ThemeContextProvider>
  )
}
