import { useMemo, useModel, useState } from "kaioken"
import { Button } from "./atoms/Button"
import { Input } from "./atoms/Input"
import { Container } from "./atoms/Container"
import { H4 } from "./atoms/Heading"

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
  const [ref, text, setText] = useModel("")
  const [todos, setTodos] = useState(loadTodos)
  const completed = useMemo(() => todos.filter((t) => t.done), [todos])
  const pending = useMemo(() => todos.filter((t) => !t.done), [todos])

  const handleToggle = (id: string) => {
    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    )
    saveTodos(newTodos)
    setTodos(newTodos)
  }

  const handleDelete = (id: string) => {
    const newTodos = todos.filter((todo) => todo.id !== id)
    saveTodos(newTodos)
    setTodos(newTodos)
  }

  const handleAdd = (e: Event) => {
    e.preventDefault()
    if (!text) return
    const newTodos = [
      ...todos,
      {
        id: crypto.randomUUID() as string,
        text,
        done: false,
      },
    ]
    saveTodos(newTodos)
    setTodos(newTodos)
    setText("")
  }

  const handleEdit = (id: string, text: string) => {
    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, text } : todo
    )
    saveTodos(newTodos)
    setTodos(newTodos)
  }

  return (
    <Container>
      <form
        onsubmit={handleAdd}
        className="flex gap-2 mb-5 items-center justify-center"
      >
        <Input ref={ref} />
        <Button>Add</Button>
      </form>
      <ToDoList
        name="Pending"
        items={pending}
        toggleItem={handleToggle}
        handleDelete={handleDelete}
        handleEdit={handleEdit}
      />
      <ToDoList
        name="Completed"
        items={completed}
        toggleItem={handleToggle}
        handleDelete={handleDelete}
        handleEdit={handleEdit}
      />
    </Container>
  )
}

function ToDoList({
  name,
  items,
  toggleItem,
  handleDelete,
  handleEdit,
}: {
  name: string
  items: ToDoItem[]
  toggleItem: (id: string) => void
  handleDelete: (id: string) => void
  handleEdit: (id: string, text: string) => void
}) {
  if (!items.length) return null
  return (
    <Container className="mb-5">
      <H4 className="mb-5">{name}</H4>
      <ul>
        {items.map((todo) => (
          <li className="w-full flex justify-between items-center gap-2 mb-2">
            <Input
              className="w-full"
              value={todo.text}
              oninput={(e) =>
                handleEdit(todo.id, (e.target as HTMLInputElement).value)
              }
            />

            <Input
              type="checkbox"
              checked={todo.done}
              onclick={(e) => (e.preventDefault(), toggleItem(todo.id))}
            />
            <Button
              onclick={(e) => (e.preventDefault(), handleDelete(todo.id))}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </Container>
  )
}
