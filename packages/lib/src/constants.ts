export const signalSymbol = Symbol.for("kaioken.signal")
export const componentSymbol = Symbol.for("kaioken.component")
export const contextProviderSymbol = Symbol.for("kaioken.contextProvider")
export const fragmentSymbol = Symbol.for("kaioken.fragment")
export const kaiokenErrorSymbol = Symbol.for("kaioken.error")

export const ELEMENT_ID_BASE = 16
export const CONSECUTIVE_DIRTY_LIMIT = 50

export const FLAG = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
} as const

export const ELEMENT_TYPE = {
  text: "#text",
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
