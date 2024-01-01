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
      <h1>App</h1>
      {/* <Todos /> */}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/test">Test</Link>
          </li>
          <li>
            <Link to="/todos">Todos</Link>
          </li>
        </ul>
      </nav>
      <Router>
        {/* <Route path="/" element={lazy(() => import("./components/HomePage"))} /> */}
        <Route path="/" element={HomePage} />
        <Route path="/test" element={TestPage} />
        <Route path="/todos" element={Todos} />
      </Router>
    </div>
  )
}

const HomePage = ({ params }: { params: Rec }) => {
  console.log("HomePage", params)
  return <div>Home</div>
}

const TestPage = () => {
  return <div>Test</div>
}
