import { $HMR_ACCEPTOR } from "./constants.js"

export type GenericHMRAcceptor<T = {}> = {
  [$HMR_ACCEPTOR]: {
    provide: () => T
    inject: (prev: T) => void
    destroy: () => void
  }
}

export function isGenericHmrAcceptor(
  thing: unknown
): thing is GenericHMRAcceptor<any> {
  return (
    !!thing &&
    (typeof thing === "object" || typeof thing === "function") &&
    $HMR_ACCEPTOR in thing &&
    typeof thing[$HMR_ACCEPTOR] === "object" &&
    !!thing[$HMR_ACCEPTOR]
  )
}
