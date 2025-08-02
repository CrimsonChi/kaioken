export {
  $SIGNAL,
  $CONTEXT,
  $CONTEXT_PROVIDER,
  $FRAGMENT,
  $KAIOKEN_ERROR,
  $HMR_ACCEPT,
  $MEMO,
  $HYDRATION_BOUNDARY,
  CONSECUTIVE_DIRTY_LIMIT,
  FLAG,
  REGEX_UNIT,
}

export { voidElements, svgTags, booleanAttributes }

const $SIGNAL = Symbol.for("kaioken.signal")
const $CONTEXT = Symbol.for("kaioken.context")
const $CONTEXT_PROVIDER = Symbol.for("kaioken.contextProvider")
const $FRAGMENT = Symbol.for("kaioken.fragment")
const $KAIOKEN_ERROR = Symbol.for("kaioken.error")
const $HMR_ACCEPT = Symbol.for("kaioken.hmrAccept")
const $MEMO = Symbol.for("kaioken.memo")
const $HYDRATION_BOUNDARY = Symbol.for("kaioken.hydrationBoundary")

const CONSECUTIVE_DIRTY_LIMIT = 50

const FLAG = {
  UPDATE: 1,
  PLACEMENT: 2,
  DELETION: 3,
  HAS_MEMO_ANCESTOR: 4,
} as const

const REGEX_UNIT = {
  AMP_G: /&/g,
  LT_G: /</g,
  GT_G: />/g,
  SQT_G: /'/g,
  DBLQT_G: /"/g,
  SLASH_G: /\//g,
  SLASHN_SLASHR_G: /[\n\r]+/g,
  ALPHA_UPPER_G: /[A-Z]/g,
} as const

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
])

const svgTags = new Set([
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "path",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "title",
  "tspan",
  "use",
])

const booleanAttributes = new Set([
  "allowfullscreen",
  "autofocus",
  "autoplay",
  "async",
  "checked",
  "compact",
  "controls",
  "contenteditable",
  "declare",
  "default",
  "defer",
  "disabled",
  "download",
  "hidden",
  "inert",
  "ismap",
  "multiple",
  "nohref",
  "noresize",
  "noshade",
  "novalidate",
  "nowrap",
  "open",
  "popover",
  "readonly",
  "required",
  "sandbox",
  "scoped",
  "selected",
  "sortable",
  "spellcheck",
  "translate",
  "wrap",
])
