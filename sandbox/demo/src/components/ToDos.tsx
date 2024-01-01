import { useState } from "reflex-ui"

type ToDoItem = {
  id: string
  text: string
  done: boolean
}

function loadFromStorage(): ToDoItem[] {
  const todos = localStorage.getItem("todos")
  if (!todos) return []
  return JSON.parse(todos) as ToDoItem[]
}
function saveToStorage(todos: ToDoItem[]) {
  localStorage.setItem("todos", JSON.stringify(todos))
}

export const Todos = () => {
  const [todos, setTodos] = useState(loadFromStorage())
  const [newTodo, setNewTodo] = useState("")

  const handleInput = (e: KeyboardEvent) =>
    setNewTodo((e.target as HTMLInputElement).value)

  const handleToggle = (id: string, e: MouseEvent) => {
    e.preventDefault()

    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    )
    setTodos(newTodos)
    saveToStorage(newTodos)
  }

  const handleAdd = () => {
    const newTodos = [
      ...todos,
      {
        id: crypto.randomUUID(),
        text: newTodo,
        done: false,
      },
    ]
    setTodos(newTodos)
    saveToStorage(newTodos)
    setNewTodo("")
  }

  const completed = todos.filter((t) => t.done)
  const pending = todos.filter((t) => !t.done)

  return (
    <div>
      <input value={newTodo} oninput={handleInput} />
      <button onclick={handleAdd}>Add</button>

      <ToDoList name="Completed" items={completed} toggleItem={handleToggle} />
      <ToDoList name="Pending" items={pending} toggleItem={handleToggle} />
    </div>
  )
}

const ToDoList = ({
  name,
  items,
  toggleItem,
}: {
  name: string
  items: ToDoItem[]
  toggleItem: (id: string, e: MouseEvent) => void
}) => {
  if (!items.length) return null
  return (
    <div>
      <h4>{name}</h4>
      <ul>
        {items.map((todo) => (
          <li>
            <span>{todo.text}</span>
            <input
              type="checkbox"
              checked={todo.done}
              onclick={(e: MouseEvent) => toggleItem(todo.id, e)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
