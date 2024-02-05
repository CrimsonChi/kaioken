// Environment: server

import { dangerouslySkipEscape, escapeInject } from "vike/server"
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types"
import { renderToString } from "kaioken"
import { PageLayout } from "./PageLayout"

export { onRenderHtml }

/**
 * The onRenderHtml() hook defines how pages are rendered to HTML.
 * @see {@link https://vike.dev/onRenderHtml}
 */
const onRenderHtml: OnRenderHtmlAsync = async (
  pageContext
): ReturnType<OnRenderHtmlAsync> => {
  // Retrieve contextual data here and call your rendering framework

  /**
   * @param {() => JSX.Element} Page
   */
  const { Page, data = {} } = pageContext as PageContextServer & {
    Page: (props: unknown) => JSX.Element
    data: Record<string, unknown>
  }
  const pageHtml = renderToString(() => (
    <PageLayout>{<Page data={data} />}</PageLayout>
  ))
  const documentHtml = escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>My App</title>
      </head>
      <body>
        <div id="page-root">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`

  return {
    documentHtml,
    pageContext: {
      // We can define pageContext values here
    },
  }
}
