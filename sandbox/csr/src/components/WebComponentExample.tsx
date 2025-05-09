import { Signal, useSignal } from "kaioken"
import { defineElement, html } from "x-templ"
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-app": {
        greeting: Signal<string>
      }
    }
  }
}

export default function WebComponentExample() {
  const greeting = useSignal("Hello world!")
  console.log("WebComponentExample")
  return (
    <div className="flex flex-col gap-2">
      <input bind:value={greeting} />
      <x-app greeting={greeting} />
    </div>
  )
}

defineElement("x-app", {
  observedAttributes: ["greeting"],
  render: function () {
    const toggled = this.$state(false)
    const count = this.$state(0)
    const greeting = this.$attribute("greeting")

    const increment = () => count.set(count.get() + 1)

    return html`
      <h1 class="text-xl">${greeting}</h1>
      <button onclick="${() => toggled.set(!toggled.get())}">Toggle</button>
      ${toggled.get()
        ? html`<x-nested onIncrement="${increment}" count="${count.get()}" />`
        : ""}
    `
  },
})

defineElement("x-nested", {
  observedAttributes: ["count"],
  render: function () {
    return html`
      <button onclick="${() => this.$emit("increment")}">
        Nested Counter: ${this.$attribute("count")}
      </button>
      <x-nested-again />
    `
  },
})

defineElement("x-nested-again", {
  render: function () {
    const count = this.$state(0)
    return html`
      <button onclick="${() => count.set(count.get() + 1)}">
        Nested Again: ${count.get()}
      </button>
    `
  },
})
