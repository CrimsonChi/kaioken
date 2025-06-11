import { Router, Route, Link } from "kaioken/router"
import { ROUTES } from "./routes"
import { signal, useComputed, useEffect, watch } from "kaioken"

const state = {
  count: {
    actual: signal(0),
  },
}

watch(() => {
  console.log("~~~~~ count changed 123 45 asd", state.count.actual.value)
})

const Home: Kaioken.FC = () => {
  const doubled = useComputed(() => {
    console.log("doubled")
    return state.count.actual.value * 2
  })
  useEffect(() => {
    console.log("Home mounted")
  }, [])

  return (
    <div>
      <h1>Home</h1>
      <p>Count: {state.count.actual}</p>
      <p>Doubled: {doubled}</p>
      <button onclick={() => state.count.actual.value++}>Increment</button>
    </div>
  )
}

function Nav() {
  return (
    <nav className=" min-h-screen p-2  mb-5 h-full">
      <div className="sticky top-0 flex flex-col gap-2">
        <Link to={"/"}>Home</Link>
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
          <Route path="/" element={<Home />} />
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
