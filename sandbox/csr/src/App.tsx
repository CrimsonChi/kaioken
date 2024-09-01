import { Router, Route, useRouter } from "kaioken"
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
import { UseSyncExternalStoreExample } from "./components/UseSyncExternalStoreExample"
import { UseModelExample } from "./components/useModelExample"
import { GlobalComputedExample } from "./components/ComputedExample"
import { LocalComputedExample } from "./components/ComputedExample"

function Home() {
  return <div className="flex flex-col gap-2">Home</div>
}

export function App() {
  return (
    <>
      <nav className=" min-h-screen p-2  mb-5 h-full">
        <div className="sticky top-0 flex flex-col gap-2">
          <Link to="/">Home</Link>
          <Link to="/useModel">UseModel</Link>
          <Link to="/todos">Todos (state, model, memo)</Link>
          <Link to="/todos-with-store">Todos (with store)</Link>
          <Link to="/counter">Counter (store)</Link>
          <Link to="/query?id=1">Query (useAsync)</Link>
          <Link to="/transitions">Dialogs (transitions, portal)</Link>
          <Link to="/memo">Memo demo</Link>
          <Link to="/big-list">Large-list rendering</Link>
          <Link to="/router-test/123?sort=desc">Route Params / Query</Link>
          <Link to="/unhandled-route">Unhandled Route</Link>
          <Link to="/filtered-list">Filtered list</Link>
          <Link to="/keyed-list">Keyed list</Link>
          <Link to="/context">Context</Link>
          <GithubIcon />
          <Link to="/useAsync">useAsync</Link>
          <Link to="/useSyncExternalStoreExample">useSyncExternalStore</Link>
        </div>
      </nav>
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route path="/" element={<Home />} />
          <Route path="/useModel" element={<UseModelExample />} />
          <Route path="/big-list" element={<BigListComponent />} />
          <Route path="/router-test/:id" element={<RouterTest />} fallthrough />
          <Route path="/memo" element={<MemoDemo />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/todos-with-store" element={<TodosWithStore />} />
          <Route path="/counter" element={<Counter />} />
          <Route path="/query" element={<ProductPage />} />
          <Route path="/transitions" element={<Transitions />} />
          <Route path="/filtered-list" element={<FilteredList />} />
          <Route path="/keyed-list" element={<KeyedList />} />
          <Route path="/context" element={<ContextExample />} />
          <Route path="/useAsync" element={<UseAsyncExample />} />
          <Route path="/computed" element={<GlobalComputedExample />} />
          <Route path="/computed-local" element={<LocalComputedExample />} />
          <Route
            path="/useSyncExternalStoreExample"
            element={<UseSyncExternalStoreExample />}
          />
          <Route path="*" element={<h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </>
  )
}

function RouterTest() {
  const { params, query } = useRouter()
  return (
    <div>
      <p>query: {query.sort}</p>
      <p>params: {JSON.stringify(params, null, 2)}</p>
      <Link to="/router-test/123?sort=desc">Home</Link>
      <Link to="/router-test/123/child-route/420?sort=desc">Child Route</Link>
      <Router>
        <Route path="/" element={<h2>Home</h2>} />
        <Route path="/child-route/:test" element={<ChildRoute />} />
      </Router>
    </div>
  )
}

function ChildRoute() {
  const { params, query, setQuery } = useRouter()
  return (
    <div>
      <h2>Child Route - {params.test}</h2>
      <button
        onclick={() =>
          setQuery({ sort: query.sort === "desc" ? "asc" : "desc" })
        }
      >
        Sort
      </button>
    </div>
  )
}
