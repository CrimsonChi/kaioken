import { Link, Route, Router, useEffect } from "reflex-ui"
import { Todos } from "./components/ToDos"
import { Rec } from "reflex-ui/src/types"

declare function lazy<T extends () => Promise<any>>(factory: T): T

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

const HomePage = ({ params }: { params: Rec }) => {
  console.log("HomePage", params)
  return <h1>Home</h1>
}

const TestPage = ({ params }: { params: Rec }) => {
  console.log("TestPage", params)
  return <h1>Test</h1>
}
