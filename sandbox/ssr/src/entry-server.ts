import { renderToString } from "kaioken"
import { App } from "./App"

async function pageTitle(path: string) {
  switch (path) {
    case "/":
      return "Home"
    default:
      return "Page not found"
  }
}

export async function render(path: string) {
  console.log("server render", path)
  const html = renderToString(() => App({ path }))
  return { html, head: `<title>${await pageTitle(path)}</title>` }
}
