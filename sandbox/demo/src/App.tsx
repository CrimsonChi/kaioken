import { useEffect } from "reflex-ui"
import { Todos } from "./components/ToDos"

export const App = () => {
  useEffect(() => {
    console.log("App useEffect")
  })

  return (
    <div>
      <h1>App</h1>
      <Todos />
    </div>
  )
}
