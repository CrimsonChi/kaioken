import { useState } from "reflex-ui"

import { CountDisplay } from "./components/CountDisplay"
import { UserDetails } from "./components/UserDetails"

export const App = () => {
  const [name, setName] = useState("John")

  return (
    <div>
      <h1>App</h1>
      <CountDisplay />
      <CountDisplay />
      <UserDetails name={name} setName={setName} />
    </div>
  )
}
