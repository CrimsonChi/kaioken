import { defineComponent } from "reflex-ui"
import { CountDisplay } from "./components/CountDisplay"
import { UserDetails } from "./components/UserDetails"

export const App = defineComponent({
  state: {
    name: "Bob",
  },
  render({ state }) {
    return (
      <div>
        <h1>App</h1>
        <CountDisplay />
        {state.name}
        <UserDetails name={state.name} setName={(val) => (state.name = val)} />
      </div>
    )
  },
})
