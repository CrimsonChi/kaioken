export function UserDetails({
  name,
  setName,
}: {
  name: string
  setName: (name: string) => void
}) {
  const handleInput = (e: Event) =>
    setName((e.target as HTMLInputElement).value)
  return (
    <div>
      <h3>{name}</h3>
      <input value={name} oninput={handleInput} />
      <input value={name} oninput={handleInput} />
    </div>
  )
}
