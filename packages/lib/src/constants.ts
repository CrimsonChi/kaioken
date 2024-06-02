export const SignalKey = Symbol.for("kaioken.signal")

export const EffectTag = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
} as const

export const componentSymbol = Symbol.for("kaioken.component")
export const elementFreezeSymbol = Symbol.for("kaioken.freezeElement")

export const elementTypes = {
  text: "#text",
  fragment: "KAIOKEN_FRAGMENT",
} as const
