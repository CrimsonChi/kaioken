// Environment: server
import { dangerouslySkipEscape, escapeInject } from "vike/server"
import type { OnRenderHtmlAsync } from "vike/types"
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
        <title>${getTitle(pageContext)}</title>
      </head>
      <body>
        <div id="page-root">${dangerouslySkipEscape(pageHtml)}</div>
        <div id="portal"></div>
      </body>
    </html>`
}
