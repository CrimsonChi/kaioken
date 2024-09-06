import { TodoItem as TodoItemType, useTodosStore } from "../store"

export function TodosWithStore() {
  const { value: todos } = useTodosStore(
    (store) => store,
    (prev, next) => prev.length === next.length
  )
  console.log("parent component")

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem todo={todo} />
      ))}
    </ul>
  )
}

function TodoItem({ todo }: { todo: TodoItemType }) {
  const { toggleTodo } = useTodosStore((store) =>
    store.find((item) => item.id === todo.id)
  )

  console.log("child component", todo.id)

  return (
    <div>
      {todo.text}
      <input
        type="checkbox"
        checked={todo.done}
        onchange={() => toggleTodo(todo.id)}
      />
    </div>
  )
}
