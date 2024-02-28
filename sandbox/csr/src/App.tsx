import { Router, Route, useState, memo } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeContextProvider } from "./ThemeContext"
import { ProductPage } from "./components/Product"
import { Messages } from "./components/Messages"
import { ModalDemo } from "./components/dialog/Modal"
import { DrawerDemo } from "./components/dialog/Drawer"
import { Link } from "./components/atoms/Link"
import { GithubIcon } from "./components/GithubIcon"

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
        <Link to="/test/123?sort=desc">Route Params / Query</Link>
        <Link to="/unhandled-route">Unhandled Route</Link>
      </nav>
      <GithubIcon />
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route
            path="/"
            element={() => (
              <div className="flex flex-col">
                <h1>Home</h1>
                <SimpleCounter />
              </div>
            )}
          />
          <Route
            path="/test/:id"
            fallthrough
            element={({ params, query }) => (
              <div className="flex flex-col">
                <p>
                  id param: <i>{params.id}</i>
                </p>
                <p>
                  sort query: <i>{query.sort}</i>
                </p>
                <Link to={`/test/${params.id}/info?sort=${query.sort}`}>
                  Child Router
                </Link>
                <Router>
                  <Route
                    path="/info"
                    element={() => (
                      <>
                        <h1>info</h1>
                        <Link to={`/test/${params.id}?sort=${query.sort}`}>
                          Back to parent
                        </Link>
                      </>
                    )}
                  />
                </Router>
              </div>
            )}
          />
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
          <Route path="*" element={() => <h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </ThemeContextProvider>
  )
}

function SimpleCounter() {
  const [count, setCount] = useState(0)
  return (
    <div id="memo">
      <span>Count: {count}</span>
      <button onclick={() => setCount((prev) => prev + 1)}>Increment</button>
      <WhenPropsChangeMemo count={1} />
      {count % 2 === 0 && <DynamicRenderMemo />}
    </div>
  )
}

let renders = 0
const DynamicRenderMemo = memo(() => {
  return (
    <div id="memo-dynamic" className="flex flex-col">
      <span className="text-red-500">Render Count: {++renders}</span>
    </div>
  )
})

let renders2 = 0
const WhenPropsChangeMemo = memo(({ count }: { count: number }) => {
  return (
    <div id="memo-props" className="flex flex-col">
      <div>Memo Demo {count}</div>
      <span>Render Count: {++renders2}</span>
    </div>
  )
})
