describe("component memoization", () => {
  beforeEach(() => {
    const port = Cypress.env("port")
    cy.visit(`http://localhost:${port}/memo`)
  })

  it("only rerenders when props change", () => {
    cy.get("main #memo #memo-props span").should("have.text", "Render Count: 1")
    cy.get("main #memo > button").click().click()
    cy.get("main #memo #memo-props span").should("have.text", "Render Count: 1")
  })

  it("allows context consumers that are memoized to rerender", () => {
    cy.get("main #memo #memo-context-consumer span").should(
      "have.text",
      "Render Count: 1"
    )
    cy.get("main #memo > button").click().click()
    cy.get("main #memo #memo-context-consumer span").should(
      "have.text",
      "Render Count: 3"
    )
  })

  it("will render as per normal when included / excluded from the vDom tree", () => {
    cy.get("main #memo #memo-dynamic > span:first-child").should(
      "have.text",
      "Render Count: 1"
    )
    cy.get("main #memo > button").click()
    cy.get("main #memo #memo-dynamic").should("not.exist")
    cy.get("main #memo > button").click()
    cy.get("main #memo #memo-dynamic").should("exist")
    cy.get("main #memo #memo-dynamic > span:first-child").should(
      "have.text",
      "Render Count: 2"
    )
    cy.get("main #memo > button").click()
    cy.get("main #memo #memo-dynamic").should("not.exist")
    cy.get("main #memo > button").click()
    cy.get("main #memo #memo-dynamic").should("exist")
    cy.get("main #memo #memo-dynamic > span:first-child").should(
      "have.text",
      "Render Count: 3"
    )
  })
})
