import { StyleScope, useState } from "kaioken"
import { Button } from "./Button"

type ToDoItem = {
  id: string
  text: string
  done: boolean
}

function saveTodos(todos: ToDoItem[]) {
  localStorage.setItem("todos", JSON.stringify(todos))
}
function loadTodos(): ToDoItem[] {
  return JSON.parse(localStorage.getItem("todos") || "[]")
}

export function Todos() {
  const [todos, setTodos] = useState(loadTodos())
  const [newTodo, setNewTodo] = useState("")

  const handleInput = (e: Event) =>
    setNewTodo((e.target as HTMLInputElement).value)

  const handleToggle = (id: string, e: MouseEvent) => {
    e.preventDefault()

    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    )
    saveTodos(newTodos)
    setTodos(newTodos)
  }

  const handleDelete = (id: string, e: MouseEvent) => {
    e.preventDefault()

    const newTodos = todos.filter((todo) => todo.id !== id)
    saveTodos(newTodos)
    setTodos(newTodos)
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
    saveTodos(newTodos)
    setTodos(newTodos)
    setNewTodo("")
  }

  const completed = todos.filter((t) => t.done)
  const pending = todos.filter((t) => !t.done)

  return (
    <StyleScope>
      <div className="todos">
        <div>
          <input value={newTodo} oninput={handleInput} />
          <Button onclick={handleAdd}>Add</Button>
        </div>
        <ToDoList
          name="Pending"
          items={pending}
          toggleItem={handleToggle}
          handleDelete={handleDelete}
        />
        <ToDoList
          name="Completed"
          items={completed}
          toggleItem={handleToggle}
          handleDelete={handleDelete}
        />
      </div>
    </StyleScope>
  )
}

function ToDoList({
  name,
  items,
  toggleItem,
  handleDelete,
}: {
  name: string
  items: ToDoItem[]
  toggleItem: (id: string, e: MouseEvent) => void
  handleDelete: (id: string, e: MouseEvent) => void
}) {
  if (!items.length) return null
  return (
    <>
      <>
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
              <Button onclick={(e: MouseEvent) => handleDelete(todo.id, e)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </>
    </>
  )
}
