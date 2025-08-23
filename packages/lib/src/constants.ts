export {
  $SIGNAL,
  $CONTEXT,
  $CONTEXT_PROVIDER,
  $FRAGMENT,
  $KIRU_ERROR,
  $HMR_ACCEPT,
  $MEMO,
  $HYDRATION_BOUNDARY,
  CONSECUTIVE_DIRTY_LIMIT,
  REGEX_UNIT,
  FLAG_UPDATE,
  FLAG_PLACEMENT,
  FLAG_DELETION,
  FLAG_HAS_MEMO_ANCESTOR,
  FLAG_STATIC_DOM,
  FLAG_MEMO,
}

export { voidElements, svgTags, booleanAttributes }

const $SIGNAL = Symbol.for("kiru.signal")
const $CONTEXT = Symbol.for("kiru.context")
const $CONTEXT_PROVIDER = Symbol.for("kiru.contextProvider")
const $FRAGMENT = Symbol.for("kiru.fragment")
const $KIRU_ERROR = Symbol.for("kiru.error")
const $HMR_ACCEPT = Symbol.for("kiru.hmrAccept")
const $MEMO = Symbol.for("kiru.memo")
const $HYDRATION_BOUNDARY = Symbol.for("kiru.hydrationBoundary")

const CONSECUTIVE_DIRTY_LIMIT = 50

const FLAG_UPDATE = 1 << 1
const FLAG_PLACEMENT = 1 << 2
const FLAG_DELETION = 1 << 3
const FLAG_HAS_MEMO_ANCESTOR = 1 << 4
const FLAG_STATIC_DOM = 1 << 5
const FLAG_MEMO = 1 << 6

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
  "feDropShadow",
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
