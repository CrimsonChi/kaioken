import { Router, Route, useState } from "kaioken"
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
import { Button } from "./components/atoms/Button"

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
  return (
    <div className="flex flex-col gap-2">
      <h1>Home</h1>
      <CounterList />
    </div>
  )
}

function CounterList() {
  const [counters, setCounters] = useState<number[]>([1, 2, 3, 4, 5])

  function move(id: number, dist: number) {
    const idx = counters.indexOf(id)
    if (idx + dist < 0 || idx + dist >= counters.length) return
    const newCounters = [...counters]
    newCounters.splice(idx, 1)
    newCounters.splice(idx + dist, 0, id)
    setCounters(newCounters)
  }

  function remove(id: number) {
    setCounters(counters.filter((c) => c !== id))
  }

  return (
    <ul>
      {counters.map((c) => (
        <li key={"item-" + c} className="flex gap-2">
          <KeyedCounterItem
            id={c}
            move={(dist) => move(c, dist)}
            remove={() => remove(c)}
          />
        </li>
      ))}
    </ul>
  )
}

interface KeyedCounterProps {
  id: number
  move: (dist: number) => void
  remove: () => void
}

function KeyedCounterItem({ id, move, remove }: KeyedCounterProps) {
  const [count, setCount] = useState(0)
  return (
    <>
      id : {id}
      <div className="flex gap-2 px-2 bg-black bg-opacity-30">
        <Button variant="primary" onclick={() => setCount((c) => c + 1)}>
          {count}
        </Button>
        <Button onclick={() => move(1)}>↓</Button>
        <Button onclick={() => move(2)}>↓↓</Button>
        <Button onclick={() => move(-1)}>↑</Button>
        <Button onclick={() => move(-2)}>↑↑</Button>
      </div>
      <button onclick={remove}>Remove</button>
    </>
  )
}
