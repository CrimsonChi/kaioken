import { useState } from "reflex-ui"

export const UserDetails = () => {
  const [name, setName] = useState("John")
  return (
    <div>
      <input value={name} />
      <Input
        value={name}
        oninput={(e: KeyboardEvent) => {
          setName((e.target as HTMLInputElement).value)
        }}
      />
    </div>
  )
}

function Input({
  value,
  oninput,
}: {
  value: string
  oninput: (e: KeyboardEvent) => void
}) {
  return <input type="text" value={value} oninput={oninput} />
}
