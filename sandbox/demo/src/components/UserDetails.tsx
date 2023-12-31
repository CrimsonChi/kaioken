import { defineComponent } from "reflex-ui"

interface Props {
  setName: (name: string) => void
  name: string
}

export const UserDetails = defineComponent<{}, Props>({
  render({ props }) {
    //console.log("render", props)
    return (
      <div>
        <input
          type="text"
          value={props.name}
          oninput={(e: KeyboardEvent) => {
            //debugger
            props.setName((e.target as HTMLInputElement).value)
          }}
        />
      </div>
    )
  },
})
