import { useState, useEffect, Router, Route, Link, StyleScope } from "reflex-ui"
import { Todos } from "./components/ToDos"

export const App = () => {
  return (
    <div>
      <h1>App</h1>
      <Counter />
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/todos">Todos</Link>
      </nav>
      <Router>
        <Route path="/" element={() => <h2>Home</h2>} />
        <Route path="/about" element={() => <h2>About</h2>} />
        <Route path="/todos" element={Todos} />
      </Router>
    </div>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    console.log("count", count)
    return () => {
      console.log("cleanup", count)
    }
  }, [count])

  return (
    <StyleScope>
      <div>
        Counter <>{count}</>
        <button onclick={() => setCount(count + 1)}>+</button>
      </div>
      <style>
        {`
        div {
          display: flex;
          align-items: center;
        }
        button {
          margin-left: 1rem;
          color: ${count % 2 ? "red" : "blue"};
        }
      `}
      </style>
    </StyleScope>
  )
}
