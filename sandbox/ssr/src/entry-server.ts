import { renderToString } from "kaioken"
import { App } from "./App"
import { PageProps } from "./types"
import { matchPath } from "kaioken"
import { PageDataGetter, pages } from "./pageData"

interface RequestData {
  path: string
  query: string
}

async function loadPageData(req: RequestData): ReturnType<PageDataGetter> {
  for (let i = 0; i < pages.length; i++) {
    const [path, getter] = pages[i]
    const { match, params, query } = matchPath(req.path, req.query, path)
    if (!match) continue
    try {
      return await getter({ params, query })
    } catch (error) {
      return { title: "500 - Internal server error" }
    }
  }
  return { title: "404 - Page not found" }
}

export async function render(request: RequestData) {
  const { title, data } = await loadPageData(request)
  const props: PageProps = { request, data }

  const head = `<title>${title}</title>
    <script>
      window.kaioken_ssr_props = JSON.parse(\`${JSON.stringify(props)}\`);
    </script>`

  const html = renderToString(() => App(props))
  return { head, html }
}
