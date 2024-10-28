import {
  Router,
  Route,
  Link,
  lazy,
  useRef,
  useCallback,
  useComputed,
  useSignal,
  signal,
  watch,
} from "kaioken"
import { SignalsExample } from "./components/SignalsExample"
import { UseAsyncExample } from "./components/UseAsyncExample"

type AppRoute = {
  title: string
  component: Kaioken.FC<any>
  fallthrough?: boolean
}

function Counter() {
  const count = useSignal(41)
  const countRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation>()

  const handleClick = useCallback(() => {
    count.value++

    animRef.current?.finish()
    animRef.current = countRef.current?.animate(
      [{ transform: "scale(2.5)" }, { transform: "scale(1)" }],
      {
        duration: 300,
        iterations: 1,
      }
    )
  }, [])

  return (
    <div className="flex flex-col gap-8 justify-center items-center">
      <button type="button" onclick={handleClick} className="cursor-pointer ">
        Increment
      </button>
      <span ref={countRef} className="text-4xl font-medium select-none">
        {count}
      </span>
    </div>
  )
}
const count = signal(1)
watch(() => console.log("count asd", count.value))

const Home: Kaioken.FC = () => {
  const double = useComputed(() => count.value * 2)

  return (
    <div>
      <h1>Home </h1>
      <button
        className="bg-primary hover:bg-primary-light text-white font-bold text-sm py-2 px-4 rounded"
        onclick={() => count.value++}
      >
        Count: {count}
        <br />
        Double: {double}
      </button>
      <Counter />
    </div>
  )
}

const ROUTES: Record<string, AppRoute> = {
  "/": {
    title: "Home",
    component: Home,
  },
  "/keyed-list-example": {
    title: "Keyed list",
    component: lazy(() =>
      import("./components/KeyedListExample").then((m) => m.KeyedListExample)
    ),
  },
  "/filtered-list-example": {
    title: "Filtered list",
    component: lazy(() =>
      import("./components/FilteredListExample").then(
        (m) => m.FilteredListExample
      )
    ),
  },
  "/big-list-example": {
    title: "Big list",
    component: lazy(() =>
      import("./components/BigListExample").then((m) => m.BigListExample)
    ),
  },
  "/context-example": {
    title: "Context",
    component: lazy(() =>
      import("./components/ContextExample").then((m) => m.ContextExample)
    ),
  },
  "/use-model-example": {
    title: "useModel",
    component: lazy(() =>
      import("./components/UseModelExample").then((m) => m.UseModelExample)
    ),
  },
  "/memo-example": {
    title: "Memo",
    component: lazy(() =>
      import("./components/MemoExample").then((m) => m.MemoExample)
    ),
  },
  "/router-example": {
    title: "Router",
    component: lazy(() =>
      import("./components/RouterExample").then((m) => m.RouterExample)
    ),
    fallthrough: true,
  },
  "/signals-example": {
    title: "Signals",
    component: SignalsExample,
    // component: lazy(() =>
    //   import("./components/SignalsExample").then((m) => m.SignalsExample)
    // ),
    fallthrough: true,
  },
  "/store-example": {
    title: "Store",
    component: lazy(() =>
      import("./components/StoreExample").then((m) => m.StoreExample)
    ),
  },
  "/transitions-example": {
    title: "Transitions",
    component: lazy(() =>
      import("./components/TransitionsExample").then(
        (m) => m.TransitionsExample
      )
    ),
  },
  "/use-async-example": {
    title: "useAsync",
    component: UseAsyncExample,
    // component: lazy(() =>
    //   import("./components/UseAsyncExample").then((m) => m.UseAsyncExample)
    // ),
  },
  "/use-sync-external-store-example": {
    title: "useSyncExternalStore",
    component: lazy(() => import("./components/UseSyncExternalStoreExample")),
  },
}

console.log("ROUTES", ROUTES)

function Nav() {
  return (
    <nav className=" min-h-screen p-2  mb-5 h-full">
      <div className="sticky top-0 flex flex-col gap-2">
        {Object.entries(ROUTES).map(([path, route]) => (
          <Link key={route.title} to={path}>
            {route.title}
          </Link>
        ))}
        <Link to="/unhandled-route">Unhandled route</Link>
      </div>
    </nav>
  )
}

export function App() {
  return (
    <>
      <Nav />
      <main className="flex items-center justify-center flex-grow w-full">
        <Router>
          {Object.entries(ROUTES).map(([path, route]) => (
            <Route
              key={path}
              path={path}
              element={<route.component />}
              fallthrough={route.fallthrough}
            />
          ))}
          <Route path="*" element={<h1>Uh-oh! Page not found :C</h1>} />
        </Router>
      </main>
    </>
  )
}
