export function BigListComponent() {
  return (
    <div>
      <ul>
        {Array.from({ length: 100e3 }).map((_, i) => (
          <li>{i}</li>
        ))}
      </ul>
    </div>
  )
}
