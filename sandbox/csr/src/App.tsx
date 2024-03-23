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
      <MyComponent />
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

function MyComponent() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="447"
      height="245"
      viewBox="0 0 447 245"
      fill="none"
    >
      <rect width="447" height="245" rx="10" fill="url(#paint0_linear_1_41)" />
      <rect y="23" width="447" height="54" fill="#2F2F2F" />
      <g clipPath="url(#clip0_1_41)">
        <rect x="45" y="101" width="361" height="38" rx="4" fill="#ADB5BE" />
        <path
          d="M363.438 125.196C362.299 125.196 361.389 124.874 360.708 124.23C360.036 123.577 359.7 122.597 359.7 121.29V118.91C359.7 117.631 360.036 116.661 360.708 115.998C361.389 115.335 362.299 115.004 363.438 115.004C364.586 115.004 365.496 115.335 366.168 115.998C366.849 116.661 367.19 117.631 367.19 118.91V121.29C367.19 122.597 366.849 123.577 366.168 124.23C365.496 124.874 364.586 125.196 363.438 125.196ZM363.438 123.88C364.212 123.88 364.786 123.661 365.16 123.222C365.533 122.774 365.72 122.149 365.72 121.346V118.826C365.72 118.023 365.519 117.407 365.118 116.978C364.716 116.539 364.156 116.32 363.438 116.32C362.71 116.32 362.15 116.544 361.758 116.992C361.366 117.431 361.17 118.042 361.17 118.826V121.346C361.17 122.167 361.356 122.797 361.73 123.236C362.112 123.665 362.682 123.88 363.438 123.88ZM374.461 125.196C373.322 125.196 372.412 124.874 371.731 124.23C371.059 123.577 370.723 122.597 370.723 121.29V118.91C370.723 117.631 371.059 116.661 371.731 115.998C372.412 115.335 373.322 115.004 374.461 115.004C375.609 115.004 376.519 115.335 377.191 115.998C377.872 116.661 378.213 117.631 378.213 118.91V121.29C378.213 122.597 377.872 123.577 377.191 124.23C376.519 124.874 375.609 125.196 374.461 125.196ZM374.461 123.88C375.236 123.88 375.81 123.661 376.183 123.222C376.556 122.774 376.743 122.149 376.743 121.346V118.826C376.743 118.023 376.542 117.407 376.141 116.978C375.74 116.539 375.18 116.32 374.461 116.32C373.733 116.32 373.173 116.544 372.781 116.992C372.389 117.431 372.193 118.042 372.193 118.826V121.346C372.193 122.167 372.38 122.797 372.753 123.236C373.136 123.665 373.705 123.88 374.461 123.88ZM385.485 125.196C384.346 125.196 383.436 124.874 382.755 124.23C382.083 123.577 381.747 122.597 381.747 121.29V118.91C381.747 117.631 382.083 116.661 382.755 115.998C383.436 115.335 384.346 115.004 385.485 115.004C386.633 115.004 387.543 115.335 388.215 115.998C388.896 116.661 389.237 117.631 389.237 118.91V121.29C389.237 122.597 388.896 123.577 388.215 124.23C387.543 124.874 386.633 125.196 385.485 125.196ZM385.485 123.88C386.259 123.88 386.833 123.661 387.207 123.222C387.58 122.774 387.767 122.149 387.767 121.346V118.826C387.767 118.023 387.566 117.407 387.165 116.978C386.763 116.539 386.203 116.32 385.485 116.32C384.757 116.32 384.197 116.544 383.805 116.992C383.413 117.431 383.217 118.042 383.217 118.826V121.346C383.217 122.167 383.403 122.797 383.777 123.236C384.159 123.665 384.729 123.88 385.485 123.88Z"
          fill="white"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_1_41"
          x1="-89.0505"
          y1="24.4042"
          x2="-61.5646"
          y2="276.127"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#D2D3D9" />
        </linearGradient>
        <clipPath id="clip0_1_41">
          <rect
            width="361"
            height="38"
            fill="white"
            transform="translate(45 101)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
