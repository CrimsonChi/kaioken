import { useEffect } from "reflex-ui"
import { CountDisplay } from "./components/CountDisplay"
import { UserDetails } from "./components/UserDetails"

export const App = () => {
  useEffect(() => {
    console.log("App useEffect")
  })

  return (
    <div>
      <h1>App</h1>
      <CountDisplay />
      <UserDetails />
    </div>
  )
}
