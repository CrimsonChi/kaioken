import { useState } from "reflex-ui"

export const UserDetails = () => {
  const [name, setName] = useState("John")
  return (
    <div>
      <input
        value={name}
        oninput={(e: KeyboardEvent) => {
          setName((e.target as HTMLInputElement).value)
        }}
      />
      <input
        value={name}
        oninput={(e: KeyboardEvent) => {
          setName((e.target as HTMLInputElement).value)
        }}
      />
    </div>
  )
}
