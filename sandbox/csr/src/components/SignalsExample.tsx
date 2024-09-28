import { signal, computed, watch, Route, Router, Link } from "kaioken"

const count = signal(0, "count")
const isTracking = signal(false, "isTracking")
const double = computed(() => {
  if (isTracking.value) {
    return count.value * 2
  }
  return 0
}, "double")

watch(() => {
  console.log("outer watch", count.value)
})

export function SignalsExample() {
  return (
    <div>
      <nav className="flex gap-2 bg-transparent">
        <Link to="/" className="underline">
          Global
        </Link>
        <Link to="/local" className="underline">
          Local
        </Link>
      </nav>
      <Router>
        <Route path="/" element={<GlobalComputedExample />} />
        <Route path="/local" element={<LocalComputedExample />} />
      </Router>
    </div>
  )
}

const GlobalComputedExample = () => {
  console.log("GlobalComputedExample")
  const divId = signal("test")
  const onInc = () => {
    count.value += 1
    divId.value += "|test"
  }

  const onSwitch = () => {
    isTracking.value = !isTracking.value
    console.log("calling on switch metohd")
  }

  watch(() => {
    console.log("inner watch", count.value)
  })

  return (
    <div id={divId} className="flex flex-col">
      <h1>Count: {count}</h1>
      <h1>Double: {double}</h1>
      <h1>is tracking: {`${isTracking}`}</h1>

      <button className="mt-4 text-left" onclick={onInc}>
        Increment
      </button>
      <button className="text-left" onclick={onSwitch}>
        Switch tracking
      </button>
    </div>
  )
}

const LocalComputedExample = () => {
  const localCount = signal(0, "local count")
  const localIsTracking = signal(false, "local is tracking")
  const localDouble = computed(() => {
    if (localIsTracking.value) {
      return localCount.value * 2
    }

    return 0
  }, "local double")

  const localQuad = computed(() => {
    return localDouble.value * 2
  }, "local quadruble")

  const onInc = () => {
    localCount.value += 1
  }

  const onSwitch = () => {
    localIsTracking.value = !localIsTracking.value
  }

  return (
    <div className="flex flex-col">
      <h1>Count: {localCount}</h1>
      <h1>Double: {localDouble}</h1>
      <h1>Quadruple: {localQuad}</h1>
      <h1>is tracking: {`${localIsTracking}`}</h1>

      <button className="mt-4 text-left" onclick={onInc}>
        Increment
      </button>
      <button className="text-left" onclick={onSwitch}>
        Switch tracking
      </button>
    </div>
  )
}
