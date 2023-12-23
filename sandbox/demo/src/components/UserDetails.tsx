import { defineComponent } from "reflex-ui"

interface Props {
  setName: (name: string) => void
  name: string
}

export const UserDetails = defineComponent<{}, Props>({
  render({ props: { name, setName } }) {
    return (
      <div>
        <input
          type="text"
          value={name}
          oninput={(e: KeyboardEvent) =>
            setName((e.target as HTMLInputElement).value)
          }
        />
      </div>
    )
  },
})
