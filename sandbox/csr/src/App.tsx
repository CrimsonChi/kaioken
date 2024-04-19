import { Router, Route, useMemo } from "kaioken"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ProductPage } from "./components/Product"
import { Link } from "./components/atoms/Link"
import { GithubIcon } from "./components/GithubIcon"
import { MemoDemo } from "./MemoDemo"
import { BigListComponent } from "./components/BigList"
import { TodosWithStore } from "./components/TodosWithStore"
import { FilteredList } from "./components/FilteredList"
import { Transitions } from "./components/Transitions"
import { KeyedList } from "./components/KeyedList"
import { ContextExample } from "./components/ContextExample"
import { UseAsyncExample } from "./components/UseAsyncExample"
import { count, todo } from "./components/signals/test"

function Nav() {
  return (
    <nav className=" min-h-screen p-2  mb-5 h-full">
      <div className="sticky top-0 flex flex-col gap-2">
        <Link to="/">Home</Link>
        <Link to="/todos">Todos (state, model, memo)</Link>
        <Link to="/todos-with-store">Todos (with store)</Link>
        <Link to="/counter">Counter (store)</Link>
        <Link to="/query?id=1">Query (useAsync)</Link>
        <Link to="/transitions">Dialogs (transitions, portal)</Link>
        <Link to="/memo">Memo demo</Link>
        <Link to="/big-list">Large-list rendering</Link>
        <Link to="/test/123?sort=desc">Route Params / Query</Link>
        <Link to="/unhandled-route">Unhandled Route</Link>
        <Link to="/filtered-list">Filtered list</Link>
        <Link to="/keyed-list">Keyed list</Link>
        <Link to="/context">Context</Link>
        <Link to="/useAsync">useAsync</Link>
        <GithubIcon />
      </div>
    </nav>
  )
}

export function App() {
  const double = useMemo(() => {
    return count.value * 2
  }, [count.value])

  return (
    <>
      <Nav />
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route
            path="/"
            element={() => {
              const onInc = () => {
                count.value += 1
                todo.value.push("boop")
                todo.notify()
              }

              return (
                <div className="flex flex-col gap-2">
                  <h1>Home</h1>
                  <button onclick={onInc}>{count}</button>
                  <p>{double}</p>
                  <div innerHTML={`<p>asd</p>`} />
                </div>
              )
            }}
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
          <Route path="/big-list" element={BigListComponent} />
          <Route path="/memo" element={MemoDemo} />
          <Route path="/todos" element={Todos} />
          <Route path="/todos-with-store" element={TodosWithStore} />
          <Route path="/counter" element={Counter} />
          <Route path="/query" element={ProductPage} />
          <Route path="/transitions" element={Transitions} />
          <Route path="/filtered-list" element={FilteredList} />
          <Route path="/keyed-list" element={KeyedList} />
          <Route path="/context" element={ContextExample} />
          <Route path="/useAsync" element={UseAsyncExample} />
          <Route path="*" element={() => <h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </>
  )
}
