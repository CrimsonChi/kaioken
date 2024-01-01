import { useState } from "reflex-ui"

type KbEv = KeyboardEvent

export const UserDetails = () => {
  const [name, setName] = useState("John")
  const handleInput = (e: KbEv) => setName((e.target as HTMLInputElement).value)
  return (
    <div>
      <h3>{name}</h3>
      <input value={name} oninput={handleInput} />
      <input value={name} oninput={handleInput} />
    </div>
  )
}
