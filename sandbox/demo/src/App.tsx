import { Router, Route, Link } from "reflex-ui"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { Theme } from "./components/Theme"
import { ThemeContextProvider } from "./ThemeContext"

export const App = () => {
  return (
    <ThemeContextProvider>
      <h1>App</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/todos">Todos</Link>
        <Link to="/counter">Counter</Link>
        <Link to="/theme">Theme</Link>
      </nav>
      <Router>
        <Route path="/" element={() => <h2>Home</h2>} />
        <Route path="/todos" element={Todos} />
        <Route path="/counter" element={Counter} />
        <Route path="/theme" element={Theme} />
      </Router>
    </ThemeContextProvider>
  )
}
