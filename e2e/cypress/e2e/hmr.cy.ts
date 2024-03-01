let counterTsx = "",
  counterModifiedTsx = ""
// const counterTsx = fs.readFileSync("../../src/Counter.tsx", {
//   encoding: "utf-8",
// })

// const counterModifiedTsx = counterTsx.replace(
//   `<div id="counter">`,
//   `<div id="counter" data-changed="true">`
// )

describe("hot module reload", () => {
  before(() =>
    cy.readFile("src/Counter.tsx").then((file) => {
      counterTsx = file
      counterModifiedTsx = counterTsx.replace(
        `<div id="counter">`,
        `<div id="counter" data-changed="true">`
      )
    })
  )
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
