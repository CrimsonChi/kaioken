import { defineComponent } from "reflex-ui"

interface Props {
  setName: (name: string) => void
  name: string
}

export const UserDetails = defineComponent<{}, Props>({
  render({ props }) {
    return (
      <div>
        <input
          type="text"
          value={props.name}
          oninput={(e: KeyboardEvent) =>
            props.setName((e.target as HTMLInputElement).value)
          }
        />
      </div>
    )
  },
})
