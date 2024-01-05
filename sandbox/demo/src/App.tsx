import {
  useState,
  useEffect,
  Router,
  Route,
  Link,
  StyleScope,
  createContext,
  useReducer,
  useContext,
} from "reflex-ui"
import { Todos } from "./components/ToDos"

const ThemeContext = createContext<"dark" | "light">(null)
const ThemeDispatchContext =
  createContext<(action: { type: "toggle" }) => void>(null)

function themeReducer(state: "dark" | "light", action: { type: "toggle" }) {
  switch (action.type) {
    case "toggle": {
      return state === "dark" ? "light" : "dark"
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export const App = () => {
  const [theme, dispatch] = useReducer(themeReducer, "dark")
  return (
    <div>
      <ThemeContext.Provider value={theme}>
        <ThemeDispatchContext.Provider value={dispatch}>
          <h1>App {theme}</h1>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/todos">Todos</Link>
            <Link to="/counter">Counter</Link>
          </nav>
          <Router>
            <Route path="/" element={() => <h2>Home</h2>} />
            <Route path="/about" element={() => <h2>About</h2>} />
            <Route path="/todos" element={Todos} />
            <Route path="/counter" element={Counter} />
          </Router>
        </ThemeDispatchContext.Provider>
      </ThemeContext.Provider>
    </div>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  const theme = useContext(ThemeContext)
  //const dispatch = useContext(ThemeDispatchContext)

  useEffect(() => {
    console.log("count", count)
    return () => {
      console.log("cleanup", count)
    }
  }, [count])

  const handleClick = () => {
    setCount((prev) => prev + 1)
    //dispatch({ type: "toggle" })
  }

  return (
    <StyleScope>
      <div>
        Counter <>{count}</>
        <button onclick={handleClick}>+</button>
      </div>
      <style>
        {`
        div {
          display: flex;
          align-items: center;
        }
        button {
          margin-left: 1rem;
          color: ${theme === "dark" ? "#ddd" : "#222"};
        }
      `}
      </style>
    </StyleScope>
  )
}
