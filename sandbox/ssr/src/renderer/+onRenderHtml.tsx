// Environment: server
import type { OnRenderHtmlAsync } from "vike/types"
import { dangerouslySkipEscape, escapeInject } from "vike/server"
import { renderToString } from "kaioken"
import { getTitle } from "./utils"
import { App } from "./App"

export const onRenderHtml: OnRenderHtmlAsync = async (
  pageContext
): ReturnType<OnRenderHtmlAsync> => {
  const pageHtml = renderToString(App, { pageContext })
  return escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <link rel="icon" href="/favicon.svg">
        <title>${getTitle(pageContext)}</title>
      </head>
      <body>
        <div id="page-root">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`
}
