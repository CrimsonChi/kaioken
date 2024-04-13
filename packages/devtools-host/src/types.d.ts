import * as kaioken from "kaioken"
declare global {
  const useRef: typeof kaioken.useRef
  const useEffect: typeof kaioken.useEffect
  const createStore: typeof kaioken.createStore
  const mount: typeof kaioken.mount
}
