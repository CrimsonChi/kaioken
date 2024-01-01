type KbEv = KeyboardEvent

export const UserDetails = ({
  name,
  setName,
}: {
  name: string
  setName: (name: string) => void
}) => {
  const handleInput = (e: KbEv) => setName((e.target as HTMLInputElement).value)
  return (
    <div>
      <h3>{name}</h3>
      <input value={name} oninput={handleInput} />
      <input value={name} oninput={handleInput} />
    </div>
  )
}
