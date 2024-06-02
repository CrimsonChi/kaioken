import { describe, it } from "node:test"
import assert from "node:assert"
import { renderToString } from "../../index.js"
import * as kaioken from "../../index.js"

describe("renderToString", () => {
  it("produces HTML with styles formatted correctly", () => {
    const App = () => {
      return (
        <div style="display:flex;">
          <h1 style={{ color: "red" }}>Hello world</h1>
        </div>
      )
    }
    const expected = `<div style="display:flex;"><h1 style="color:red;">Hello world</h1></div>`
    const res = renderToString(App)

    assert.strictEqual(res, expected)
  })
  it("is able to derive Context correctly", () => {
    const MyContext = kaioken.createContext("test")
    const App = () => {
      return (
        <div>
          <MyContext.Provider value="test123">
            <ChildComponent />
          </MyContext.Provider>
        </div>
      )
    }
    const ChildComponent = () => {
      const ctx = kaioken.useContext(MyContext)
      return <h1>{ctx}</h1>
    }
    const expected = `<div><h1>test123</h1></div>`
    const res = renderToString(App)
    assert.strictEqual(res, expected)
  })
})
