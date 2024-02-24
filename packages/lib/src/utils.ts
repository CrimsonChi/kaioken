export function isVNode(thing: unknown): thing is Kaioken.VNode {
  return typeof thing === "object" && thing !== null && "type" in thing
}

export function isValidChild(child: unknown) {
  return child !== null && child !== undefined && typeof child !== "boolean"
}

type Rec = Record<string, unknown>

export const propFilters = {
  internalProps: ["children", "ref"],
  isEvent: (key: string) => key.startsWith("on"),
  isProperty: (key: string) =>
    !propFilters.internalProps.includes(key) && !propFilters.isEvent(key),
  isNew: (prev: Rec, next: Rec) => (key: string) => prev[key] !== next[key],
  isGone: (_prev: Rec, next: Rec) => (key: string) => !(key in next),
}

export const selfClosingTags = [
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
