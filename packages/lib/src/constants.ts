export const signalSymbol = Symbol.for("kaioken.signal")
export const componentSymbol = Symbol.for("kaioken.component")
export const contextDataSymbol = Symbol.for("kaioken.contextData")

export const ELEMENT_ID_BASE = 16
export const CONSECUTIVE_DIRTY_LIMIT = 50

export const EFFECT_TAG = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
} as const

export const ELEMENT_TYPE = {
  text: "#text",
  fragment: "KAIOKEN_FRAGMENT",
} as const

export const REGEX_UNIT = {
  AMP_G: /&/g,
  LT_G: /</g,
  GT_G: />/g,
  SQT_G: /'/g,
  DBLQT_G: /"/g,
  SLASH_G: /\//g,
  SLASHN_SLASHR_G: /[\n\r]+/g,
  ALPHA_UPPER_G: /[A-Z]/g,
} as const
