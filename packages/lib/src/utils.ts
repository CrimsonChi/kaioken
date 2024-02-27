export {
  isVNode,
  isValidChild,
  propFilters,
  selfClosingTags,
  svgTags,
  propToHtmlAttr,
  propValueToHtmlAttrValue,
}

function isVNode(thing: unknown): thing is Kaioken.VNode {
  return typeof thing === "object" && thing !== null && "type" in thing
}

function isValidChild(child: unknown) {
  return child !== null && child !== undefined && typeof child !== "boolean"
}

const propFilters = {
  internalProps: ["children", "ref"],
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
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
]

function propToHtmlAttr(key: string) {
  switch (key.toLowerCase()) {
    case "classname":
      return "class"
    case "htmlfor":
      return "for"
    default:
      return key
  }
}

function styleObjectToCss(obj: Partial<CSSStyleDeclaration>) {
  let cssString = ""
  for (const key in obj) {
    const cssKey = key.replace(/[A-Z]/g, "-$&").toLowerCase()
    cssString += `${cssKey}:${obj[key]};`
  }
  return cssString
}

function propValueToHtmlAttrValue(key: string, value: unknown) {
  switch (key) {
    case "style":
      if (typeof value === "object" && !!value) return styleObjectToCss(value)
    default:
      return String(value)
  }
}
