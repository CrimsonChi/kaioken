import { signal, StyleObject, useEffect } from "kaioken"
export function Page() {
  const styles = signal<StyleObject>({
    color: "red",
  })

  useEffect(() => {
    styles.value.color = "green"
    styles.notify()
  }, [])
  return (
    <div className="p-6" style={styles}>
      test
    </div>
  )
}
