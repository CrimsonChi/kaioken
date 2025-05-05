import { useSignal, useComputed, For, Derive } from "kaioken"
import { Router, Route, Link } from "kaioken/router"
import { ROUTES } from "./routes"

const Home: Kaioken.FC = () => {
  const items = useSignal([0, 1, 2, 3, 4])
  const doubledItems = useComputed(() => items.value.map((i) => i * 2))

  const name = useSignal("bob")
  const age = useSignal(42)
  const person = useComputed(() => ({ name: name.value, age: age.value }))

  return (
    <div>
      <ul>
        <For each={doubledItems}>{(item) => <li>{item}</li>}</For>
      </ul>
      <button
        onclick={() => (items.value = [...items.value, items.value.length])}
      >
        Add
      </button>

      <SomeOtherComponent />

      <Derive from={person}>
        {(person) => (
          <div>
            {person.name} is {person.age} years old
          </div>
        )}
      </Derive>
      <input bind:value={name} />
      <input type="number" bind:value={age} />
    </div>
  )
}

const SomeOtherComponent: Kaioken.FC = () => {
  console.log("SomeOtherComponent")
  return <div>SomeOtherComponent</div>
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
