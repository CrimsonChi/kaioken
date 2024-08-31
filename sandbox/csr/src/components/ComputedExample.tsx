import { computed, signal } from "kaioken"
import { count, double, isTracking } from "../signals"

export const GlobalComputedExample = () => {
  const onInc = () => {
    count.value += 1
  }

  const onSwitch = () => {
    isTracking.value = !isTracking.value
  }

  return (
    <div className="flex flex-col">
      <h1>Count: {count.value}</h1>
      <h1>Double: {double.value}</h1>
      <h1>is tracking: {`${isTracking.value}`}</h1>

      <button className="mt-4 text-left" onclick={onInc}>
        Increment
      </button>
      <button className="text-left" onclick={onSwitch}>
        Switch tracking
      </button>
    </div>
  )
}

export const LocalComputedExample = () => {
  const localCount = signal(0)
  localCount.displayName = "local count"
  const localIsTracking = signal(false)
  localIsTracking.displayName = "local is tracking"
  const localDouble = computed(() => {
    console.log("local double getter ran")
    if (localIsTracking.value) {
      return localCount.value * 2
    }

    return 0
  })
  localDouble.displayName = "local double"

  const onInc = () => {
    localCount.value += 1
  }

  const onSwitch = () => {
    localIsTracking.value = !localIsTracking.value
  }

  return (
    <div className="flex flex-col">
      <h1>Count: {localCount.value}</h1>
      <h1>Double: {localDouble.value}</h1>
      <h1>is tracking: {`${localIsTracking.value}`}</h1>

      <button className="mt-4 text-left" onclick={onInc}>
        Increment
      </button>
      <button className="text-left" onclick={onSwitch}>
        Switch tracking
      </button>
    </div>
  )
}
