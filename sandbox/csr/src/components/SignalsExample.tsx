import {
  signal,
  computed,
  Route,
  Router,
  Link,
  watch,
  useComputed,
  useSignal,
} from "kaioken"

const count = signal(0, "coussdsdnt")
const isTracking = signal(true, "isTracking")
const double = computed(() => {
  if (isTracking.value) {
    console.log("hello world 123", count.value)
    return count.value * 2
  }

  return 0
}, "double")

const quadruple = computed(() => {
  console.log("quad 12345", count.value)
  return count.value * 4
}, "quadruple")

const watcher = watch(() => {
  console.log("count 123", count.value)
})

export default function SignalsExample() {
  return (
    <div>
      <nav className="flex gap-2 bg-transparent">
        <Link to="/" inherit className="underline">
          Global
        </Link>
        <Link to="/local" inherit className="underline">
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
  const onInc = async () => {
    count.value += 1
  }

  const onSwitch = () => {
    isTracking.value = !isTracking.value
    console.log("calling on switch method")
  }

  return (
    <div className="flex flex-col">
      <h1>count: {count}</h1>
      <h1>Double: {double}</h1>
      <h1>Quadruple: {quadruple}</h1>
      <h1>is tracking: {`${isTracking}`}</h1>

      <button className="mt-4 text-left" onclick={onInc}>
        Increment
      </button>
      <button className="text-left" onclick={onSwitch}>
        Switch tracking
      </button>
      <button className="text-left" onclick={() => watcher.start()}>
        start watcher
      </button>
      <button className="text-left" onclick={() => watcher.stop()}>
        stop watcher
      </button>
    </div>
  )
}

const LocalComputedExample = () => {
  const localCount = useSignal(0, "local count")
  const localIsTracking = useSignal(false, "local is tracking")
  const localDouble = useComputed(() => {
    if (localIsTracking.value) {
      return localCount.value * 100
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
