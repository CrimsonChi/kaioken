// Environment: server
import { dangerouslySkipEscape, escapeInject } from "vike/server"
import type { OnRenderHtmlAsync } from "vike/types"
import { renderToString } from "kaioken"
import { getTitle } from "./utils"
import { PageShell } from "./PageShell"

export { onRenderHtml }

const onRenderHtml: OnRenderHtmlAsync = async (
  pageContext
): ReturnType<OnRenderHtmlAsync> => {
  const { Page, data = {} } = pageContext
  const title = getTitle(pageContext)

  const pageHtml = renderToString(() => (
    <PageShell pageContext={pageContext}>
      <Page {...data} />
    </PageShell>
  ))
  return escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>${title}</title>
      </head>
      <body>
        <div id="page-root">${dangerouslySkipEscape(pageHtml)}</div>
        <div id="portal"></div>
      </body>
    </html>`

  // return {
  //   documentHtml,
  //   pageContext: {
  //     // We can define pageContext values here
  //   },
  // }
}
