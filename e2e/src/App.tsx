import { Link, Route, Router, memo, useModel, useState } from "kaioken"
import { Counter } from "./Counter"

export function App() {
  const [toggled, setToggled] = useState(false)
  return (
    <main>
      <header>
        <h1>Hello World</h1>
      </header>
      {toggled && <p>Toggled</p>}
      <Counter />
      <TodoList />
      <button id="toggle-btn" onclick={() => setToggled(!toggled)}>
        toggle
      </button>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
      <div id="router-outlet">
        <Router>
          <Route path="/" element={() => <h2>Home</h2>} />
          <Route path="/about" element={() => <h2>About</h2>} />
          <Route path="/memo" element={SimpleCounter} />
        </Router>
      </div>
    </main>
  )
}

function TodoList() {
  const [inputRef, inputValue, setInputValue] = useModel("")
  const [items, setItems] = useState<{ text: string }[]>([
    { text: "buy coffee" },
    { text: "walk the dog" },
    { text: "push the latest commits" },
  ])

  function addItem() {
    setItems((items) => [...items, { text: inputValue }])
    setInputValue("")
  }

  return (
    <div id="todos">
      <input ref={inputRef} />
      <button onclick={addItem} />
      <ul>
        {items.map((item) => (
          <li>{item.text}</li>
        ))}
      </ul>
    </div>
  )
}

function SimpleCounter() {
  const [count, setCount] = useState(0)
  return (
    <div id="memo">
      <span>Count: {count}</span>
      <button onclick={() => setCount((prev) => prev + 1)}>Increment</button>
      <WhenPropsChangeMemo count={1} />
      {count % 2 === 0 && <DynamicRenderMemo />}
    </div>
  )
}

let renders = 0
const DynamicRenderMemo = memo(() => {
  return (
    <div id="memo-dynamic" className="flex flex-col">
      <span className="text-red-500">Render Count: {++renders}</span>
    </div>
  )
})

let renders2 = 0
const WhenPropsChangeMemo = memo(({ count }: { count: number }) => {
  return (
    <div id="memo-props" className="flex flex-col">
      <div>Memo Demo {count}</div>
      <span>Render Count: {++renders2}</span>
    </div>
  )
})
