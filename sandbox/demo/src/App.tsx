import { Router, Route, Link } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeSettings } from "./components/ThemeSettings"
import { ThemeContextProvider } from "./ThemeContext"
import { ProductPage } from "./components/Product"
import { Messages } from "./components/Messages"
import { MemoCounter } from "./components/MemoCounter"

export function App() {
  return (
    <ThemeContextProvider>
      <h1>App</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/todos">Todos</Link>
        <Link to="/counter">Counter</Link>
        <Link to="/theme">Theme</Link>
        <Link to="/memo">Memo</Link>
        <Link to="/query?id=1">Query</Link>
        <Link to="/messages">Messages</Link>
      </nav>
      <Router>
        <Route path="/" element={() => <h2>Home</h2>} />
        <Route path="/todos" element={Todos} />
        <Route path="/counter" element={Counter} />
        <Route path="/theme" element={ThemeSettings} />
        <Route path="/memo" element={MemoCounter} />
        <Route path="/query" element={ProductPage} />
        <Route path="/messages" element={Messages} />
      </Router>
    </ThemeContextProvider>
  )
}
