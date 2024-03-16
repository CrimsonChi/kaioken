import { Router, Route, useState, useEffect } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeContextProvider } from "./ThemeContext"
import { ProductPage } from "./components/Product"
import { Messages } from "./components/Messages"
import { Link } from "./components/atoms/Link"
import { GithubIcon } from "./components/GithubIcon"
import { MemoDemo } from "./MemoDemo"
import { BigListComponent } from "./components/BigList"
import { TodosWithStore } from "./components/TodosWithStore"
import { FilteredList } from "./components/FilteredList"
import { Transitions } from "./components/Transitions"

export function App() {
  return (
    <ThemeContextProvider>
      <nav className=" min-h-screen p-2  mb-5 h-full">
        <div className="sticky top-0 flex flex-col gap-2">
          <Link to="/">Home</Link>
          <Link to="/todos">Todos (state, model, memo)</Link>
          <Link to="/todos-with-store">Todos (with store)</Link>
          <Link to="/counter">Counter (store)</Link>
          <Link to="/query?id=1">Query (useFetch)</Link>
          <Link to="/messages">Messages (useOptimistic)</Link>
          <Link to="/transitions">Dialogs (transitions, portal)</Link>
          <Link to="/memo">Memo demo</Link>
          <Link to="/big-list">Large-list rendering</Link>
          <Link to="/test/123?sort=desc">Route Params / Query</Link>
          <Link to="/unhandled-route">Unhandled Route</Link>
          <Link to="/filtered-list">Filtered list</Link>
          <GithubIcon />
        </div>
      </nav>

      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route path="/" element={Home} />
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
          <Route path="/big-list" element={BigListComponent} />
          <Route path="/memo" element={MemoDemo} />
          <Route path="/todos" element={Todos} />
          <Route path="/todos-with-store" element={TodosWithStore} />
          <Route path="/counter" element={Counter} />
          <Route path="/query" element={ProductPage} />
          <Route path="/messages" element={Messages} />
          <Route path="/transitions" element={Transitions} />
          <Route path="/filtered-list" element={FilteredList} />
          <Route path="*" element={() => <h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </ThemeContextProvider>
  )
}

function Home() {
  const [count, setCount] = useState(0)
  const [show, setShow] = useState(false)
  console.log("home render", show)

  function handleClick() {
    setCount((prev) => prev + 1)
    setShow((prev) => !prev)
  }
  return (
    <div className="flex flex-col gap-2">
      <h1>Home</h1>
      <div>
        <button onclick={handleClick}>Increment {count}</button>
      </div>
      <div>
        <Multiply values={[69, 420]} />
      </div>
    </div>
  )
}

function Multiply({ values }: { values: number[] }) {
  const [multiplier, setMultiplier] = useState(1)
  useEffect(() => {
    const id = setInterval(() => {
      setMultiplier((m) => m + 1)
    }, 420)
    return () => clearInterval(id)
  }, [])
  return values.reduce((a, b) => a * b, multiplier)
}
