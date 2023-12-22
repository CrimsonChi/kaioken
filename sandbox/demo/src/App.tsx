import { defineComponent } from "reflex-ui"
import { TimeDisplay } from "./components/TimeDisplay"

export const App = defineComponent({
  render() {
    return (
      <div>
        <h1>App</h1>
        <TimeDisplay />
      </div>
    )
  },
})
