import fs from "node:fs"
import { render } from "./dist/server/entry-server.js"

const html = fs.readFileSync("./dist/client/index.html", "utf-8")

const index = html.replace("<body></body>", `<body>${render()}</body>`)

//fs.writeFileSync("./dist/client/index.html", index)

// clone the contents of "./dist/client" into "./docs"

fs.mkdirSync("./docs", { recursive: true })
fs.cpSync("./dist/client", "./docs", { recursive: true })

// replace "./docs/index.html" with the generated index.html

fs.writeFileSync("./docs/index.html", index)
