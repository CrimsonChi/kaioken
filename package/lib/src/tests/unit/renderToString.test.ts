import "mocha"
import { createElement, renderToString } from "../../"
import { expect } from "chai"

describe("When a component is rendered to string", () => {
  const component = createElement(
    "div",
    { "data-test": 123 },
    createElement("h1", {}, "Hello world")
  )
  const expected = `<div data-test="123"><h1>Hello world</h1></div>`
  it(`products the expected HTML ${expected}`, () => {
    const res = renderToString(component)
    expect(res).to.eq(expected)
  })
})
