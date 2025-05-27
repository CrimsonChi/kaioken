import { Router, Route, Link } from "kaioken/router"
import { ROUTES } from "./routes"
import { For, useSignal } from "kaioken"

function shuffle(array: Array<any>) {
  let currentIndex = array.length

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ]
  }
}

function spliceRandom(array: Array<any>) {
  const idx = Math.floor(Math.random() * array.length)
  array.splice(idx, 1)
}

const Home: Kaioken.FC = () => {
  const items = useSignal("abcdefghijklmnopqrstuvwxyz".split(""))
  console.log("Home")
  return (
    <div>
      <h1>Home</h1>
      <For each={items}>{(item) => <div key={item}>{item}</div>}</For>
      <button onclick={() => (shuffle(items.value), items.notify())}>
        Shuffle
      </button>
      <button onclick={() => (spliceRandom(items.value), items.notify())}>
        Splice
      </button>
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
