import { node, nodeToCtxMap } from "./globals.js"
import type { AppContext } from "./appContext"

export {
  isVNode,
  isValidChild,
  vNodeContains,
  applyRecursive,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
  shallowCompare,
  getNodeAppContext,
  getCurrentNode,
  encodeHtmlEntities,
  noop,
  propFilters,
  selfClosingTags,
  svgTags,
  booleanAttributes,
}

const noop = Object.freeze(() => {})

function getNodeAppContext(node: Kaioken.VNode): AppContext | undefined {
  return nodeToCtxMap.get(node)
}

function getCurrentNode() {
  return node.current
}

function isVNode(thing: unknown): thing is Kaioken.VNode {
  return typeof thing === "object" && thing !== null && "type" in thing
}

function isValidChild(child: unknown) {
  return child !== null && child !== undefined && typeof child !== "boolean"
}

function vNodeContains(
  haystack: Kaioken.VNode,
  needle: Kaioken.VNode,
  checkSiblings = false
): boolean {
  if (haystack === needle) return true
  const stack: Kaioken.VNode[] = [haystack]
  while (stack.length) {
    const n = stack.pop()!
    if (n === needle) return true
    n.child && stack.push(n.child)
    checkSiblings && n.sibling && stack.push(n.sibling)
    checkSiblings = true
  }
  return false
}

function applyRecursive(
  node: Kaioken.VNode,
  func: (node: Kaioken.VNode) => void
) {
  const nodes: Kaioken.VNode[] = [node]
  const apply = (node: Kaioken.VNode) => {
    func(node)
    node.child && nodes.push(node.child)
    node.sibling && nodes.push(node.sibling)
  }
  while (nodes.length) apply(nodes.shift()!)
}

function shallowCompare<T>(objA: T, objB: T) {
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#47;")
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
  "ismap",
  "multiple",
  "nohref",
  "noresize",
  "noshade",
  "novalidate",
  "nowrap",
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

function propToHtmlAttr(key: string) {
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
    case "playsInline":
    case "readOnly":
    case "itemscope":
    case "rowSpan":
    case "crossOrigin":
      return key.toLowerCase()

    default:
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

function styleObjectToCss(obj: Partial<CSSStyleDeclaration>) {
  let cssString = ""
  for (const key in obj) {
    const cssKey = key.replace(/[A-Z]/g, "-$&").toLowerCase()
    cssString += `${cssKey}:${obj[key]};`
  }
  return cssString
}

function propValueToHtmlAttrValue(key: string, value: unknown) {
  return key === "style" && typeof value === "object" && !!value
    ? styleObjectToCss(value)
    : String(value)
}
