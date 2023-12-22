import { defineComponent } from "reflex-ui"

export const TimeDisplay = defineComponent({
  state: {
    time: Date.now(),
  },

  init: function ({ state }) {
    console.log("init")
    const interval = setInterval(() => {
      state.time = Date.now()
    }, 1000)

    return () => {
      console.log("cleanup")
      clearInterval(interval)
    }
  },

  render({ state }) {
    return (
      <div>
        <p>{new Date(state.time).toLocaleTimeString()}</p>
      </div>
    )
  },
})
