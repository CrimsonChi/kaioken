import { TodoItem as TodoItemType, useTodosStore } from "../store"

export function TodosWithStore() {
  const todo = useTodosStore.getState()[0]
  const todo2 = useTodosStore.getState()[1]

  console.log("parent component")

  return (
    <ul>
      <TodoItem todo={todo} id={1} />
      <TodoItem todo={todo2} id={2} />
    </ul>
  )
}

function TodoItem({ todo, id }: { todo: TodoItemType; id: number }) {
  const { toggleTodo } = useTodosStore((store) =>
    store.filter((items) => items.id === todo.id)
  )

  console.log("child component", id)

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
