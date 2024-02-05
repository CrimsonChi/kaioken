import { Counter } from "../../components/Counter"

export { Page }

/**
 * An empty page
 * @see {@link https://vike.dev/render-modes#html-only}
 */
function Page(): JSX.Element {
  return (
    <div>
      <h1>Hello World</h1>
      <br />
      <Counter />
    </div>
  )
}
