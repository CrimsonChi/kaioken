// import {
//   Link,
//   Route,
//   Router,
//   createContext,
//   useContext,
//   useEffect,
//   useReducer,
//   useRef,
// } from "reflex-ui"
// import { Todos } from "./components/ToDos"
// import { RouteChildProps } from "reflex-ui/src/types"

// const ThemeContext = createContext<"dark" | "light">(null)
// const ThemeDispatchContext =
//   createContext<(action: { type: "toggle" }) => void>(null)

// function themeReducer(state: "dark" | "light", action: { type: "toggle" }) {
//   switch (action.type) {
//     case "toggle": {
//       return state === "dark" ? "light" : "dark"
//     }
//     default: {
//       throw new Error(`Unhandled action type: ${action.type}`)
//     }
//   }
// }

// export const App = () => {
//   const [theme, dispatch] = useReducer(themeReducer, "dark")

//   useEffect(() => {
//     console.log("App useEffect")
//   })

//   return (
//     <ThemeContext.Provider value={theme}>
//       <ThemeDispatchContext.Provider value={dispatch}>
//         <div>
//           <>Test</>
//           <nav>
//             <ul>
//               <li>
//                 <Link to="/">Home</Link>
//               </li>
//               <li>
//                 <Link to="/test/asdasd">Test</Link>
//               </li>
//               <li>
//                 <Link to="/todos">Todos</Link>
//               </li>
//             </ul>
//           </nav>
//           <Router>
//             {/* <Route path="/" element={lazy(() => import("./components/HomePage"))} /> */}
//             <Route path="/" element={HomePage} />
//             <Route path="/test/:thing" element={TestPage} />
//             <Route path="/todos" element={Todos} />
//           </Router>
//           {/* {createPortal(
//           <div>Portal</div>,
//           document.getElementById("portal-root")!
//         )} */}
//         </div>
//       </ThemeDispatchContext.Provider>
//     </ThemeContext.Provider>
//   )
// }

// const HomePage = () => {
//   const inputRef = useRef<HTMLInputElement>(null)
//   const theme = useContext(ThemeContext)
//   const dispatch = useContext(ThemeDispatchContext)

//   useEffect(() => {
//     console.log("HomePage useEffect")
//     //debugger
//     inputRef.current?.focus()
//   })
//   return (
//     <div>
//       <h1>Home</h1>
//       {theme}
//       <input type="text" ref={inputRef} />
//       <button
//         onclick={() => {
//           debugger
//           dispatch({ type: "toggle" })
//         }}
//       >
//         Toggle Theme
//       </button>
//     </div>
//   )
// }

// const TestPage = ({ params }: RouteChildProps) => {
//   console.log("TestPage", params)
//   const inputRef = useRef<HTMLInputElement>(null)

//   useEffect(() => {
//     console.log("TestPage useEffect")
//     inputRef.current?.focus()
//   })
//   return (
//     <div>
//       <h1>Test</h1>
//       <input type="text" ref={inputRef} />
//     </div>
//   )
// }
