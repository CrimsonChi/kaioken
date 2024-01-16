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
  const [ref, text, setText] = useModel<HTMLInputElement, string>("")
  const [todos, setTodos] = useState(loadTodos)
  const completed = useMemo(() => todos.filter((t) => t.done), [todos])
  const pending = useMemo(() => todos.filter((t) => !t.done), [todos])

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

  return (
    <Container>
      <form action={handleAdd} className="flex gap-2 mb-5 items-center">
        <Input ref={ref} />
        <Button>Add</Button>
      </form>
      {{ x: 123 }}
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
    </Container>
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
    <Container className="mb-5">
      <H4 className="mb-5">{name}</H4>
      <ul>
        {items.map((todo) => (
          <li className="w-full flex justify-between items-center gap-2 mb-2">
            <span className="w-full">{todo.text}</span>
            <Input
              type="checkbox"
              checked={todo.done}
              onclick={(e) => toggleItem(todo.id, e)}
            />
            <Button onclick={(e) => handleDelete(todo.id, e)}>Delete</Button>
          </li>
        ))}
      </ul>
    </Container>
  )
}
