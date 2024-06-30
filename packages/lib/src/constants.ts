export const SignalKey = Symbol.for("kaioken.signal")
export const componentSymbol = Symbol.for("kaioken.component")
export const contextDataSymbol = Symbol.for("kaioken.contextData")

export const EffectTag = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
} as const

export const elementTypes = {
  text: "#text",
  fragment: "KAIOKEN_FRAGMENT",
} as const
