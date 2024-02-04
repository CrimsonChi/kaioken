import { GlobalContext, renderToString, setGlobalCtx } from "kaioken"
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
  setGlobalCtx(new GlobalContext())
  return {
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
    html: renderToString(() => App({ request: { path } })),
  }
}
