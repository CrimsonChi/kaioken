import { renderToReadableStream } from "kaioken/ssr/server"
import App from "./App"

export function render() {
  //<!DOCTYPE html>
  return renderToReadableStream(App)
}
