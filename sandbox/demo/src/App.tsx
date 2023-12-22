import { defineComponent } from "reflex-ui"
import { TimeDisplay } from "./components/TimeDisplay"
import { UserDetails } from "./components/UserDetails"

export const App = defineComponent({
  state: {
    name: "Bob",
  },
  render({ state }) {
    const { name } = state
    return (
      <div>
        <h1>App</h1>
        <TimeDisplay />
        {name}
        <UserDetails name={name} setName={(val) => (state.name = val)} />
      </div>
    )
  },
})
