export const EffectTag = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
} as const

export const componentSymbol = Symbol.for("kaioken.component")
export const elementFreezeSymbol = Symbol.for("kaioken.freezeElement")

export const elementTypes = {
  text: "TEXT_ELEMENT",
  fragment: "KAIOKEN_FRAGMENT",
}
