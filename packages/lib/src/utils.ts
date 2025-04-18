import { node, nodeToCtxMap, renderMode } from "./globals.js"
import { $CONTEXT_PROVIDER, $FRAGMENT, FLAG, REGEX_UNIT } from "./constants.js"
import { unwrap } from "./signals/utils.js"
import { KaiokenError } from "./error.js"
import type { AppContext } from "./appContext"
import type { ExoticVNode } from "./types.utils"
import { __DEV__ } from "./env.js"
import { flags } from "./flags.js"

export {
  isVNode,
  isFragment,
  isLazy,
  isContextProvider,
  isExoticVNode,
  isVNodeDeleted,
  vNodeContains,
  getCurrentVNode,
  getVNodeAppContext,
  commitSnapshot,
  traverseApply,
  postOrderApply,
  findParent,
  classNamePropToString,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
  propsToElementAttributes,
  styleObjectToString,
  shallowCompare,
  sideEffectsEnabled,
  encodeHtmlEntities,
  noop,
  latest,
  propFilters,
  selfClosingTags,
  svgTags,
  booleanAttributes,
  safeStringify,
}

type VNode = Kaioken.VNode

const noop: () => void = Object.freeze(() => {})

/**
 * This is a no-op in production. It is used to get the latest
 * iteration of a component or signal after HMR has happened.
 */
function latest<T>(thing: T): T {
  let tgt: any = thing
  if (__DEV__) {
    while ("__next" in tgt) {
      tgt = tgt.__next as typeof tgt
    }
  }
  return tgt
}

/**
 * Returns false if called during "stream" or "string" render modes.
 */
function sideEffectsEnabled(): boolean {
  return renderMode.current === "dom" || renderMode.current === "hydrate"
}

function isVNodeDeleted(vNode: VNode): boolean {
  return flags.get(vNode.flags, FLAG.DELETION)
}

function isVNode(thing: unknown): thing is VNode {
  return typeof thing === "object" && thing !== null && "type" in thing
}

function isExoticVNode(thing: unknown): thing is ExoticVNode {
  return (
    isVNode(thing) &&
    (thing.type === $FRAGMENT || thing.type === $CONTEXT_PROVIDER)
  )
}

function isFragment(vNode: VNode): vNode is VNode & { type: typeof $FRAGMENT } {
  return vNode.type === $FRAGMENT
}

function isLazy(vNode: VNode): boolean {
  return (
    typeof vNode.type === "function" &&
    "displayName" in vNode.type &&
    vNode.type.displayName === "Kaioken.lazy"
  )
}

function isContextProvider(
  thing: unknown
): thing is VNode & { type: typeof $CONTEXT_PROVIDER } {
  return isVNode(thing) && thing.type === $CONTEXT_PROVIDER
}

function getCurrentVNode(): VNode | undefined {
  return node.current
}

function getVNodeAppContext(vNode: VNode): AppContext {
  const n = nodeToCtxMap.get(vNode)
  if (!n)
    throw new KaiokenError({
      message: "Unable to find VNode's AppContext.",
      vNode,
    })
  return n
}

function commitSnapshot(vNode: VNode): void {
  vNode.prev = { ...vNode, props: { ...vNode.props }, prev: undefined }
  vNode.flags = 0
}

function vNodeContains(haystack: VNode, needle: VNode): boolean {
  if (haystack === needle) return true
  let checkSiblings = false
  const stack: VNode[] = [haystack]
  while (stack.length) {
    const n = stack.pop()!
    if (n === needle) return true
    n.child && stack.push(n.child)
    checkSiblings && n.sibling && stack.push(n.sibling)
    checkSiblings = true
  }
  return false
}

function traverseApply(vNode: VNode, func: (node: VNode) => void): void {
  let applyToSiblings = false
  const nodes: VNode[] = [vNode]
  const apply = (node: VNode) => {
    func(node)
    node.child && nodes.push(node.child)
    applyToSiblings && node.sibling && nodes.push(node.sibling)
    applyToSiblings = true
  }
  while (nodes.length) apply(nodes.shift()!)
}

function postOrderApply(
  tree: VNode,
  callbacks: {
    /** called upon traversing to the next parent, and on the root */
    onAscent: (vNode: VNode) => void
    /** called before traversing to the next parent */
    onBeforeAscent?: (vNode: VNode) => void
    /** called before traversing to the next child */
    onDescent?: (vNode: VNode) => void
  }
): void {
  const root = tree
  const rootChild = root.child
  if (!rootChild) {
    callbacks.onAscent(root)
    return
  }

  callbacks.onDescent?.(root)
  let branch = rootChild
  while (branch) {
    let c = branch
    while (c) {
      callbacks.onDescent?.(c)
      if (!c.child) break
      c = c.child
    }

    while (c && c !== root) {
      callbacks.onAscent(c)
      if (c.sibling) {
        branch = c.sibling
        break
      }
      callbacks.onBeforeAscent?.(c)
      c = c.parent!
    }
    if (c === root) break
  }

  callbacks.onAscent(root)
}

function findParent(
  vNode: Kaioken.VNode,
  predicate: (n: Kaioken.VNode) => boolean
) {
  let n: Kaioken.VNode | undefined = vNode.parent
  while (n) {
    if (predicate(n)) return n
    n = n.parent
  }
  return undefined
}

function shallowCompare<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true
  }
  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false
  }

  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false

    for (const [key, value] of objA) {
      if (!Object.is(value, objB.get(key))) {
        return false
      }
    }
    return true
  }

  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false

    for (const value of objA) {
      if (!objB.has(value)) {
        return false
      }
    }
    return true
  }

  const keysA = Object.keys(objA)
  if (keysA.length !== Object.keys(objB).length) {
    return false
  }
  for (const keyA of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keyA as string) ||
      !Object.is(objA[keyA as keyof T], objB[keyA as keyof T])
    ) {
      return false
    }
  }
  return true
}

function encodeHtmlEntities(text: string): string {
  return text
    .replace(REGEX_UNIT.AMP_G, "&amp;")
    .replace(REGEX_UNIT.LT_G, "&lt;")
    .replace(REGEX_UNIT.GT_G, "&gt;")
    .replace(REGEX_UNIT.DBLQT_G, "&quot;")
    .replace(REGEX_UNIT.SQT_G, "&#039;")
    .replace(REGEX_UNIT.SLASH_G, "&#47;")
}

const propFilters = {
  internalProps: ["children", "ref", "key", "innerHTML"],
  isEvent: (key: string) => key.startsWith("on"),
  isProperty: (key: string) =>
    !propFilters.internalProps.includes(key) && !propFilters.isEvent(key),
}

const selfClosingTags = [
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
  "param",
  "source",
  "track",
  "wbr",
]

const svgTags = [
  "svg",
  "clipPath",
  "circle",
  "ellipse",
  "g",
  "defs",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "tspan",
  "use",
  "foreignObject",
  "animateTransform",
  "desc",
  "title",
  "switch",
  "symbol",
  "linearGradient",
  "radialGradient",
  "stop",
  "textPath",
  "marker",
  "feGaussianBlur",
  "feOffset",
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
]

const booleanAttributes = [
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
  // "draggable",
  "hidden",
  "inert",
  "ismap",
  "multiple",
  "nohref",
  "noresize",
  "noshade",
  "novalidate",
  "nowrap",
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
]

function propToHtmlAttr(key: string): string {
  switch (key) {
    case "className":
      return "class"
    case "htmlFor":
      return "for"
    case "tabIndex":
    case "formAction":
    case "formMethod":
    case "formEncType":
    case "contentEditable":
    case "spellCheck":
    case "allowFullScreen":
    case "autoPlay":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "noModule":
    case "noValidate":
    case "popoverTarget":
    case "popoverTargetAction":
    case "playsInline":
    case "readOnly":
    case "itemscope":
    case "rowSpan":
    case "crossOrigin":
      return key.toLowerCase()

    default:
      if (key.indexOf("-") > -1) return key
      if (key.startsWith("aria"))
        return "aria-" + key.substring(4).toLowerCase()

      return snakeCaseAttrs.get(key) || key
  }
}

const snakeCaseAttrs = new Map([
  ["acceptCharset", "accept-charset"],
  ["accentHeight", "accent-height"],
  ["alignmentBaseline", "alignment-baseline"],
  ["arabicForm", "arabic-form"],
  ["baselineShift", "baseline-shift"],
  ["capHeight", "cap-height"],
  ["clipPath", "clip-path"],
  ["clipRule", "clip-rule"],
  ["colorInterpolation", "color-interpolation"],
  ["colorInterpolationFilters", "color-interpolation-filters"],
  ["colorProfile", "color-profile"],
  ["colorRendering", "color-rendering"],
  ["dominantBaseline", "dominant-baseline"],
  ["enableBackground", "enable-background"],
  ["fillOpacity", "fill-opacity"],
  ["fillRule", "fill-rule"],
  ["floodColor", "flood-color"],
  ["floodOpacity", "flood-opacity"],
  ["fontFamily", "font-family"],
  ["fontSize", "font-size"],
  ["fontSizeAdjust", "font-size-adjust"],
  ["fontStretch", "font-stretch"],
  ["fontStyle", "font-style"],
  ["fontVariant", "font-variant"],
  ["fontWeight", "font-weight"],
  ["glyphName", "glyph-name"],
  ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
  ["glyphOrientationVertical", "glyph-orientation-vertical"],
  ["horizAdvX", "horiz-adv-x"],
  ["horizOriginX", "horiz-origin-x"],
  ["httpEquiv", "http-equiv"],
  ["imageRendering", "image-rendering"],
  ["letterSpacing", "letter-spacing"],
  ["lightingColor", "lighting-color"],
  ["markerEnd", "marker-end"],
  ["markerMid", "marker-mid"],
  ["markerStart", "marker-start"],
  ["overlinePosition", "overline-position"],
  ["overlineThickness", "overline-thickness"],
  ["paintOrder", "paint-order"],
  ["panose-1", "panose-1"],
  ["pointerEvents", "pointer-events"],
  ["renderingIntent", "rendering-intent"],
  ["shapeRendering", "shape-rendering"],
  ["stopColor", "stop-color"],
  ["stopOpacity", "stop-opacity"],
  ["strikethroughPosition", "strikethrough-position"],
  ["strikethroughThickness", "strikethrough-thickness"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeDashoffset", "stroke-dashoffset"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeMiterlimit", "stroke-miterlimit"],
  ["strokeOpacity", "stroke-opacity"],
  ["strokeWidth", "stroke-width"],
  ["textAnchor", "text-anchor"],
  ["textDecoration", "text-decoration"],
  ["textRendering", "text-rendering"],
  ["transformOrigin", "transform-origin"],
  ["underlinePosition", "underline-position"],
  ["underlineThickness", "underline-thickness"],
  ["unicodeBidi", "unicode-bidi"],
  ["unicodeRange", "unicode-range"],
  ["unitsPerEm", "units-per-em"],
  ["vAlphabetic", "v-alphabetic"],
  ["vHanging", "v-hanging"],
  ["vIdeographic", "v-ideographic"],
  ["vMathematical", "v-mathematical"],
  ["vectorEffect", "vector-effect"],
  ["vertAdvY", "vert-adv-y"],
  ["vertOriginX", "vert-origin-x"],
  ["vertOriginY", "vert-origin-y"],
  ["wordSpacing", "word-spacing"],
  ["writingMode", "writing-mode"],
  ["xmlnsXlink", "xmlns:xlink"],
  ["xHeight", "x-height"],
])

function styleObjectToString(obj: Partial<CSSStyleDeclaration>): string {
  let cssString = ""
  for (const key in obj) {
    const cssKey = key.replace(REGEX_UNIT.ALPHA_UPPER_G, "-$&").toLowerCase()
    cssString += `${cssKey}:${obj[key]};`
  }
  return cssString
}

function classNamePropToString(className: unknown): string {
  if (typeof className === "string") return className
  if (Array.isArray(className)) return className.filter(Boolean).join(" ")
  return ""
}

function stylePropToString(style: unknown) {
  if (typeof style === "string") return style
  if (typeof style === "object" && !!style) return styleObjectToString(style)
  return ""
}

function propValueToHtmlAttrValue(key: string, value: unknown): string {
  return key === "style" && typeof value === "object" && !!value
    ? styleObjectToString(value)
    : String(value)
}
function propsToElementAttributes(props: Record<string, unknown>): string {
  const attrs: string[] = []
  const { className, style, ...rest } = props
  if (className) {
    attrs.push(`class="${classNamePropToString(unwrap(className))}"`)
  }
  if (style) {
    attrs.push(`style="${stylePropToString(unwrap(style))}"`)
  }

  const keys = Object.keys(rest).filter(propFilters.isProperty)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    let val = unwrap(props[k])
    if (val === null || val === undefined) continue

    const key = propToHtmlAttr(k)
    switch (typeof val) {
      case "function":
      case "symbol":
        continue
      case "boolean":
        if (booleanAttributes.indexOf(key) > -1) {
          if (val) attrs.push(key)
          continue
        }
    }
    attrs.push(`${key}="${val}"`)
  }
  return attrs.join(" ")
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(value, (_, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[CIRCULAR]"
      }
      seen.add(value)
    }
    if (typeof value === "function") {
      return value.toString()
    }
    return value
  })
}
