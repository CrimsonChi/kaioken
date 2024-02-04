import { Router, Route } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeContextProvider } from "./ThemeContext"
import { ProductPage } from "./components/Product"
import { Messages } from "./components/Messages"
import { ModalDemo } from "./components/dialog/Modal"
import { DrawerDemo } from "./components/dialog/Drawer"
import { H1 } from "./components/atoms/Heading"
import { Link } from "./components/atoms/Link"

export function App() {
  return (
    <ThemeContextProvider>
      <H1 className="mb-5">App</H1>
      <nav className="flex flex-wrap gap-2 justify-center mb-5">
        <Link to="/">Home</Link>
        <Link to="/todos">Todos</Link>
        <Link to="/counter">Counter</Link>
        <Link to="/query?id=1">Query</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/transitions">Transitions</Link>
      </nav>
      <Counter />
      <main>
        <Router>
          <Route path="/" element={() => <h2>Home</h2>} />
          <Route path="/todos" element={Todos} />
          <Route path="/counter" element={Counter} />
          <Route path="/query" element={ProductPage} />
          <Route path="/messages" element={Messages} />
          <Route
            path="/transitions"
            element={() => (
              <>
                <ModalDemo /> <DrawerDemo />
              </>
            )}
          />
        </Router>
      </main>
    </ThemeContextProvider>
  )
}
