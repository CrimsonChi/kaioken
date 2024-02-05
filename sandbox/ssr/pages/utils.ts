// /pages/utils.js
// Environment: server & client

import { PageContext } from "vike/types"

export { getTitle }

function getTitle(pageContext: PageContext): string {
  // The value exported by /pages/**/+title.js is available at pageContext.config.title
  // @ts-expect-error idk why these types are being dumb...
  const val = pageContext.config.title
  if (typeof val === "function") {
    return val(pageContext)
  }
  return val
}
