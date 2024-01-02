import { Link, Route, Router, useEffect, useRef } from "reflex-ui"
import { Todos } from "./components/ToDos"
import { RouteChildProps } from "reflex-ui/src/types"

export const App = () => {
  useEffect(() => {
    console.log("App useEffect")
  })

  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/test/asdasd">Test</Link>
          </li>
          <li>
            <Link to="/todos">Todos</Link>
          </li>
        </ul>
      </nav>
      <Router>
        {/* <Route path="/" element={lazy(() => import("./components/HomePage"))} /> */}
        <Route path="/" element={HomePage} />
        <Route path="/test/:thing" element={TestPage} />
        <Route path="/todos" element={Todos} />
      </Router>
    </div>
  )
}

const HomePage = ({ params }: RouteChildProps) => {
  console.log("HomePage", params)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log("HomePage useEffect")
    //debugger
    inputRef.current?.focus()
  })
  return (
    <div>
      <h1>Home</h1>
      <input type="text" ref={inputRef} />
    </div>
  )
}

const TestPage = ({ params }: RouteChildProps) => {
  console.log("TestPage", params)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log("TestPage useEffect")
    inputRef.current?.focus()
  })
  return (
    <div>
      <h1>Test</h1>
      <input type="text" ref={inputRef} />
    </div>
  )
}
