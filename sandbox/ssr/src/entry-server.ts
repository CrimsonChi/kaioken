import { renderToString } from "kaioken"
import { App } from "./App"

function pageTitle(path: string) {
  switch (path) {
    case "/":
      return "Home"
    default:
      return "Page not found"
  }
}

interface ServerContext {
  path: string
}

export function render({ path }: ServerContext) {
  return {
    html: renderToString(() => App({ request: { path } })),
    head: `
    <title>${pageTitle(path)}</title>
    <script>
      window.kaioken_ssr_props = {
        request: {
          path: "${path}",
        },
      };
    </script>
    `,
  }
}
