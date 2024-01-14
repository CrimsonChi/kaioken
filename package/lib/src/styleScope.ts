import type { VNode } from "./types"
import { useState } from "./hooks/index.js"

export { StyleScope }

type Props = {
  children?: JSX.Element
}
type StyleRule = {
  selector: string
  body: string
  isKeyframe?: boolean
}

let slugOffset = 0
function useSlug() {
  const [slug] = useState(
    Math.random().toString(36).substring(2, 8) + slugOffset++
  )
  return slug
}

function StyleScope({ children }: Props) {
  const slug = useSlug()

  if (!children) return null

  const asArr = children as VNode[]
  const style = asArr.find((v) => v.type === "style")
  if (!style) return children

  const scopeId = `s-${slug}`

  const styleContent = style?.props?.children[0]?.props.nodeValue
  const rules = styleContent ? parseCSS(styleContent) : []
  transformStyles(style, scopeId, rules)

  for (const child of asArr) {
    if (child === style) continue
    applyStyles(child, rules, scopeId)
  }

  return children
}

function transformStyles(node: VNode, scopeId: string, rules: StyleRule[]) {
  node.props.children[0].props.nodeValue = rules
    .reduce((acc, rule) => {
      const selector = rule.selector
      const scopedSelector = rule.isKeyframe
        ? selector
        : `${selector.startsWith(".") ? selector : ` ${selector}`}.${scopeId}`
      return `${acc}${scopedSelector}{${rule.body}}`
    }, "")
    .replace(/\s\s+/g, " ")
}

function applyStyles(node: VNode, rules: StyleRule[], scopeId: string) {
  const rule = rules.find(
    (r) =>
      r.selector === node.type ||
      (r.selector.startsWith(".") &&
        r.selector.substring(1) === node.props.className)
  )
  if (rule) {
    node.props.className = ((node.props.className || "") + " " + scopeId).trim()
  }
  if (node.props.children) {
    node.props.children.forEach((child) => applyStyles(child, rules, scopeId))
  }
}

function isKeyframeSelector(selector: string) {
  return selector.startsWith("@keyframes") || selector.endsWith("%")
}

function parseCSS(css: string): StyleRule[] {
  let openBrackets = 0
  let selector = ""
  let body = ""
  let isKeyframe = false
  const rules: StyleRule[] = []
  for (const char of css) {
    if (char === "{") {
      if (openBrackets === 0) {
        selector = selector.trim()
        isKeyframe = isKeyframeSelector(selector)
      } else if (isKeyframe) {
        body += "{"
      }
      openBrackets++
    } else if (char === "}") {
      openBrackets--
      if (openBrackets === 0) {
        body = body.trim()
        rules.push({ selector, body, isKeyframe })
        selector = ""
        body = ""
      }
      if (isKeyframe) body += "}"
    } else {
      if (openBrackets === 0) {
        selector += char
      } else {
        body += char
      }
    }
  }

  return rules
}
