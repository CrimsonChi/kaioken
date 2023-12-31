import { defineComponent } from "reflex-ui"

export const CountDisplay = defineComponent({
  state: {
    count: 0,
  },

  init({ state }) {
    console.log("init")
    const interval = setInterval(() => {
      state.count++
    }, 1e3)

    return () => {
      console.log("cleanup")
      clearInterval(interval)
    }
  },

  render({ state }) {
    //console.log("render", state)
    return (
      <div>
        <p>{state.count}</p>
        <button onclick={() => state.count++}>+1</button>
      </div>
    )
  },
})
