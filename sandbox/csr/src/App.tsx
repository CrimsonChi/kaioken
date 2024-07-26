import { Router, Route, useState, useRouter } from "kaioken"
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

// const { data, loading, error, invalidate } = useAsync(async () => {
//   return (await fetch(`https://dummyjson.com/products/${productId}`)).json()
// }, [productId])

// type Resolved<T> = T extends Promise<infer U> ? U : T
// type CacheKeys = [string, ...any[]]

// type UseCacheResult<T> =
//   | {
//       data: T
//       loading: false
//       error: null
//     }
//   | { data: null; loading: true; error: null }
//   | { data: null; loading: false; error: Error }

// function useCache<T>(
//   key: CacheKeys,
//   resource: (() => T) | (() => Promise<T>)
// ): UseCacheResult<Resolved<T>> {
//   return {} as any as UseCacheResult<Resolved<T>>
// }

// type CacheInvalidationConfig = {
//   keys?: CacheKeys
//   predicate?: (data: any) => boolean
// }
// class CacheContext {
//   invalidate = (cfg?: CacheInvalidationConfig) => 123
// }

// const CacheCtx = createContext<CacheContext | null>(null)
// function CacheProvider(props: {
//   context: CacheContext
//   children?: JSX.Children
// }) {
//   return (
//     <CacheCtx.Provider value={props.context}>
//       {props.children}
//     </CacheCtx.Provider>
//   )
// }

// const loadProduct = async ({ id }: { id: number }): Promise<Product> =>
//   (await fetch(`https://dummyjson.com/products/${id}`)).json()

// const myCacheCtx = new CacheContext()
// const _App = () => {
//   return (
//     <CacheProvider context={myCacheCtx}>
//       <ProductView id={1} />
//     </CacheProvider>
//   )
// }
// function ProductView({ id }: { id: number }) {
//   const { data, loading, error } = useCache(["product", { id }], loadProduct)
//   myCacheCtx.invalidate({ keys: ["product", { id }] })

//   const [formData, setFormData] = useState<Product | null>(data)

//   const handleSubmit = async () => {}

//   return data ? (
//     <form className="flex flex-col gap-2" onsubmit={handleSubmit}>
//       <div className="form-control">
//         <label className="label">Product</label>
//         <input
//           type="text"
//           className="input"
//           value={formData?.title}
//           onchange={(e) =>
//             setFormData({ ...(formData as Product), title: e.target.value })
//           }
//         />
//       </div>
//     </form>
//   ) : loading ? (
//     <p>Loading...</p>
//   ) : (
//     <p>{error.message}</p>
//   )
// }

// type Product = {
//   id: number
//   title: string
// }

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
        <Link to="/router-test/123?sort=desc">Route Params / Query</Link>
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

function Test() {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Cntr />
      {show && <div>test</div>}
      <Cntr />
      <button onclick={() => setShow(!show)}>toggle</button>
    </div>
  )
}
function Cntr() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <div>{count}</div>
      <button onclick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

export function App() {
  return (
    <>
      <Nav />
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          <Route path="/" element={<Test />} />
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
