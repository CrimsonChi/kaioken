import { useModel, useState } from "kaioken"

export function TodoList() {
  const [inputRef, inputValue, setInputValue] = useModel<HTMLInputElement>("")
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
