import { Router, Route, useEffect } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeContextProvider } from "./ThemeContext"
import { ProductPage } from "./components/Product"
import { Messages } from "./components/Messages"
import { ModalDemo } from "./components/dialog/Modal"
import { DrawerDemo } from "./components/dialog/Drawer"
import { H1 } from "./components/atoms/Heading"
import { Link } from "./components/atoms/Link"

let start = performance.now()

function Home() {
  const length = 10e3
  useEffect(() => {
    console.log(`effect took ${performance.now() - start}ms`)
  }, [])
  const children = Array.from({ length }).map((_, idx) => <li>{idx}</li>)
  return (
    <div>
      <H1>Home</H1>
      <div>
        <ul>{children}</ul>
      </div>
    </div>
  )
}

export function App() {
  return (
    <ThemeContextProvider>
      <nav className="flex flex-col flex-wrap gap-2 min-h-screen p-2 justify-center mb-5">
        <Link to="/">Home</Link>
        <Link to="/todos">Todos (state, model, memo)</Link>
        <Link to="/counter">Counter (store)</Link>
        <Link to="/query?id=1">Query (useFetch)</Link>
        <Link to="/messages">Messages (useOptimistic)</Link>
        <Link to="/transitions">Dialogs (transitions, portal)</Link>
      </nav>
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route path="/" element={Home} />
          <Route path="/todos" element={Todos} />
          <Route path="/counter" element={Counter} />
          <Route path="/query" element={ProductPage} />
          <Route path="/messages" element={Messages} />
          <Route
            path="/transitions"
            element={() => (
              <div className="flex gap-2">
                <ModalDemo />
                <DrawerDemo />
              </div>
            )}
          />
        </Router>
      </main>
    </ThemeContextProvider>
  )
}
