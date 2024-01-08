import type { VNode } from "./types"
import { useState } from "./hooks/index.js"

export { StyleScope }

type Props = {
  children?: JSX.Element
}
type StyleRule = {
  selector: string
  body: string
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
  node.props.children[0].props.nodeValue = rules.reduce((acc, rule) => {
    const selector = rule.selector
    const body = rule.body.replace(/(\r\n|\n|\r)/gm, "")
    const scopedSelector = selector
      .split(",")
      .map((s) => `${s}.${scopeId}`)
      .join(",")
    return `${acc}${scopedSelector}{${body}}`
  }, "") as string
}

function applyStyles(node: VNode, rules: StyleRule[], scopeId: string) {
  const rule = rules.find((r) => r.selector === node.type)
  if (rule) {
    let className = node.props.className || ""
    if (rule.selector === node.type) {
      className += ` ${scopeId}`
    }
    node.props.className = className.trim()
  }
  if (node.props.children) {
    node.props.children.forEach((child) => applyStyles(child, rules, scopeId))
  }
}

function parseCSS(css: string): StyleRule[] {
  const rules = css.split("}")
  return rules
    .map((r) => {
      const [selector, body] = r.split("{")
      if (!selector || !body) return null
      const trimmedSelector = selector.trim()
      const trimmedBody = body.trim()
      return { selector: `${trimmedSelector}`, body: trimmedBody }
    })
    .filter((r) => r) as StyleRule[]
}
