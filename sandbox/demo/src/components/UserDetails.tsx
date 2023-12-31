export const UserDetails = ({
  name,
  setName,
}: {
  name: string
  setName: (name: string) => void
}) => {
  return (
    <div>
      <input value={name} />
      <input
        type="text"
        value={name}
        oninput={(e: KeyboardEvent) => {
          setName((e.target as HTMLInputElement).value)
        }}
      />
    </div>
  )
}
