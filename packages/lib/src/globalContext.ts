import type { AppContext } from "./appContext"
import { __DEV__ } from "./env.js"
import { createHMRContext } from "./hmr.js"
import { createProfilingContext } from "./profiling.js"
import { Store } from "./store"

export { createKiruGlobalContext, type GlobalKiruEvent, type KiruGlobalContext }

interface ReactiveMap<V> {
  add(key: string, value: V): void
  delete(key: string): void
  subscribe(cb: (value: Record<string, V>) => void): () => void
  readonly size: number
}

function createReactiveMap<V>(): ReactiveMap<V> {
  const map = new Map<string, V>()
  const listeners = new Set<(value: Record<string, V>) => void>()

  function add(key: string, value: V): void {
    if (map.has(key)) return
    map.set(key, value)
    notify()
  }

  function deleteKey(key: string): void {
    if (!map.has(key)) return
    map.delete(key)
    notify()
  }

  function notify(): void {
    const val = Object.fromEntries(map)
    listeners.forEach((cb) => cb(val))
  }

  function subscribe(cb: (value: Record<string, V>) => void): () => void {
    listeners.add(cb)
    cb(Object.fromEntries(map))
    return () => listeners.delete(cb)
  }

  return {
    add,
    delete: deleteKey,
    subscribe,
    get size() {
      return map.size
    },
  }
}

type Evt =
  | {
      name: "mount"
      data?: undefined
    }
  | {
      name: "unmount"
      data?: undefined
    }
  | {
      name: "update"
      data?: undefined
    }
  | {
      name: "error"
      data: Error
    }

type GlobalKiruEvent = Evt["name"]

interface KiruGlobalContext {
  readonly apps: AppContext[]
  stores?: ReactiveMap<Store<any, any>>
  HMRContext?: ReturnType<typeof createHMRContext>
  profilingContext?: ReturnType<typeof createProfilingContext>
  globalState: Record<symbol, any>
  emit<T extends Evt>(event: T["name"], ctx: AppContext, data?: T["data"]): void
  on<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data: T["data"]) => void
  ): void
  off<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data?: T["data"]) => void
  ): void
}

function createKiruGlobalContext(): KiruGlobalContext {
  const contexts = new Set<AppContext>()
  const listeners = new Map<
    GlobalKiruEvent,
    Set<(ctx: AppContext, data?: Evt["data"]) => void>
  >()
  const globalState: Record<symbol, any> = {}

  let stores: ReactiveMap<Store<any, any>> | undefined
  let HMRContext: ReturnType<typeof createHMRContext> | undefined
  let profilingContext: ReturnType<typeof createProfilingContext> | undefined

  function emit<T extends Evt>(
    event: T["name"],
    ctx: AppContext,
    data?: T["data"]
  ): void {
    listeners.get(event)?.forEach((cb) => cb(ctx, data))
  }

  function on<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data: T["data"]) => void
  ): void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)!.add(callback)
  }

  function off<T extends Evt>(
    event: T["name"],
    callback: (ctx: AppContext, data?: T["data"]) => void
  ): void {
    listeners.get(event)?.delete(callback)
  }

  const globalContext: KiruGlobalContext = {
    get apps() {
      return Array.from(contexts)
    },
    get stores() {
      return stores
    },
    get HMRContext() {
      return HMRContext
    },
    get profilingContext() {
      return profilingContext
    },
    globalState,
    emit,
    on,
    off,
  }

  // Initialize event listeners
  on("mount", (ctx) => contexts.add(ctx))
  on("unmount", (ctx) => contexts.delete(ctx))

  if (__DEV__) {
    HMRContext = createHMRContext()
    profilingContext = createProfilingContext()
    stores = createReactiveMap()
  }

  return globalContext
}
