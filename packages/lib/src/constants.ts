export enum EffectTag {
  UPDATE = 1,
  PLACEMENT = 2,
  DELETION = 3,
}

export const componentSymbol = Symbol.for("kaioken.component")

export const elementTypes = {
  text: "TEXT_ELEMENT",
  fragment: "KAIOKEN_FRAGMENT",
}
