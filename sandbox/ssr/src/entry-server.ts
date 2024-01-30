import { renderToString } from "kaioken"
import { App } from "./App"

export async function render(url: string) {
  console.log("server render", url)

  const html = renderToString(App)
  return { html }
}
