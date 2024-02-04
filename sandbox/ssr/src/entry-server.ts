import { renderToString } from "kaioken"
import { App } from "./App"
import { loadProduct } from "./api"
import { PageProps } from "./types"

async function pageData(
  path: string
): Promise<{ title: string; data?: PageProps["data"] }> {
  switch (path) {
    case "/":
      return { title: "Home" }
    case "/products":
      return { title: "Products" }
    default:
      try {
        if (path.startsWith("/products/")) {
          const id = Number(path.substring("/products/".length))
          const product = await loadProduct(id.toString())
          return {
            title: product.title,
            data: { product },
          }
        }
      } catch (e) {}
      return { title: "Page not found" }
  }
}

interface ServerContext {
  path: string
}

export async function render({ path }: ServerContext) {
  const { title, data } = await pageData(path)
  const props: PageProps = {
    request: { path },
    data,
  }

  const head = `<title>${title}</title>
    <script>
      window.kaioken_ssr_props = JSON.parse(\`${JSON.stringify(props)}\`);
    </script>`

  const html = renderToString(() => App(props))
  return { head, html }
}
