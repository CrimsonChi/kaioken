describe("rendering", () => {
  beforeEach(() => {
    const port = Cypress.env("port")
    cy.visit(`http://localhost:${port}`)
  })
  it("displays the correct text in the site heading", () => {
    cy.get("header h1").should("have.text", "Hello World")
  })
})
