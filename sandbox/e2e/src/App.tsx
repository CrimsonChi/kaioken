import { Link, Route, Router, useModel, useState } from "kaioken"
import { Counter } from "./Counter"

export function App() {
  return (
    <main>
      <header>
        <h1>Hello World</h1>
      </header>
      <Counter />
      <TodoList />
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
        </Router>
      </div>
    </main>
  )
}

function TodoList() {
  const [inputRef, inputValue, setInputValue] = useModel<
    HTMLInputElement,
    string
  >("")
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
