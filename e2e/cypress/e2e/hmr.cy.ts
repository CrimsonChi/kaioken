const counterTsx = `import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div id="counter">
      {count % 2 === 0 ? (
        <span data-even={true}>{count}</span>
      ) : (
        <span data-odd={true}>{count}</span>
      )}
      <button onclick={() => setCount((prev) => prev + 1)}>increment</button>
      {count > 0 && count % 2 === 0 && <p>count is even</p>}
    </div>
  )
}
`

const counterModifiedTsx = `import { useState } from "kaioken"

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div id="counter" data-changed="true">
      {count % 2 === 0 ? (
        <span data-even={true}>{count}</span>
      ) : (
        <span data-odd={true}>{count}</span>
      )}
      <button onclick={() => setCount((prev) => prev + 1)}>increment</button>
      {count > 0 && count % 2 === 0 && <p>count is even</p>}
    </div>
  )
}
`

describe("hot module reload", () => {
  beforeEach(() => {
    const port = Cypress.env("port")
    cy.visit(`http://localhost:${port}`)
  })
  afterEach(() => cy.writeFile("src/Counter.tsx", counterTsx))

  it("can update a component in the VDOM & DOM after changing the file, without causing full refresh", () => {
    cy.window()
      .then((win) => {
        // @ts-expect-error
        win["test_marker"] = 123
      })
      .then(() => cy.writeFile("src/Counter.tsx", counterModifiedTsx))
      .then(() => cy.get("#counter").should("have.attr", "data-changed"))
      .then(() => cy.window().should("have.property", "test_marker"))
  })

  it("can persist component state throught HMR updates", () => {
    cy.get("#counter button").click() // set counter state to 1
    cy.window()
      .then((win) => {
        // @ts-expect-error
        win["test_marker"] = 123
        return win
      })
      .then(() => cy.writeFile("src/Counter.tsx", counterModifiedTsx))
      .then(() => cy.window().should("have.property", "test_marker"))
      .then(() => cy.get("#counter span").should("have.text", 1))
  })
})
