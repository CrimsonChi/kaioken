import { usePageContext } from "$/context/pageContext"
import { NavLink } from "./atoms/NavLink"
import { UserAuth } from "./UserAuth"

export function Navbar() {
  const { user } = usePageContext()
  return (
    <div className="p-5 shrink-0 flex items-end justify-between bg-black bg-opacity-20">
      <nav className="flex gap-2">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/users">Users</NavLink>
        {user && user.isAdmin && <NavLink href="/admin">Admin</NavLink>}
      </nav>
      <UserAuth />
    </div>
  )
}
