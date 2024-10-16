import { Router, Route, Link, lazy, useState, useEffect } from "kaioken"
import { countStore } from "./countStore"
import { SignalsExample } from "./components/SignalsExample"

type AppRoute = {
  title: string
  component: Kaioken.FC<any>
  fallthrough?: boolean
}

const Home: Kaioken.FC = () => {
  useEffect(() => {
    console.log("Home")
  }, [])
  const [isAlive, setIsAlive] = useState({
    some: {
      nested: {
        value: true,
        fn: () => 123,
      },
    },
  })
  useEffect(() => {
    console.log(`isAlive ${isAlive}`)
  }, [isAlive])
  return (
    <div>
      <h1>Home {isAlive.some.nested.fn()}</h1>
      <button
        onclick={() => {
          setIsAlive((prev) => ({
            ...prev,
            some: {
              ...prev.some,
              nested: {
                ...prev.some.nested,
                value: !prev.some.nested.value,
              },
            },
          }))
        }}
      >
        Unmount
      </button>
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
    component: lazy(() =>
      import("./components/UseAsyncExample").then((m) => m.UseAsyncExample)
    ),
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
