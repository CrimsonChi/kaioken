import { Router, Route, Link, useState, useMemo } from "reflex-ui"
import { Todos } from "./components/ToDos"
import { Counter } from "./components/Counter"
import { ThemeSettings } from "./components/ThemeSettings"
import { ThemeContextProvider } from "./ThemeContext"
import { Product } from "./components/Product"

export const App = () => {
  return (
    <ThemeContextProvider>
      <h1>App</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/todos">Todos</Link>
        <Link to="/counter">Counter</Link>
        <Link to="/theme">Theme</Link>
        <Link to="/memo">Memo</Link>
        <Link to="/query">Query</Link>
      </nav>
      <Router>
        <Route path="/" element={() => <h2>Home</h2>} />
        <Route path="/todos" element={Todos} />
        <Route path="/counter" element={Counter} />
        <Route path="/theme" element={ThemeSettings} />
        <Route path="/memo" element={UseMemoDemo} />
        <Route path="/query" element={Product} />
      </Router>
    </ThemeContextProvider>
  )
}

const UseMemoDemo = () => {
  const [count, setCount] = useState(0)
  const [count2, setCount2] = useState(0)

  const memoizedValue = useMemo(() => {
    console.log("useMemo")
    return count + 1
  }, [count])

  return (
    <div>
      <div>count: {count}</div>
      <div>count2: {count2}</div>
      <div>memoizedValue: {memoizedValue}</div>
      <button onclick={() => setCount(count + 1)}>+1</button>
      <button onclick={() => setCount2(count2 + 1)}>+1</button>
    </div>
  )
}
