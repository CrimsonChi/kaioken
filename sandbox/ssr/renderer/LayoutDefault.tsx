import { NavLink } from "$/components/atoms/NavLink"
import { UserAuth } from "$/components/UserAuth"
import { usePageContext } from "$/context/pageContext"

export function LayoutDefault({ children }: { children?: JSX.Element[] }) {
  const { user } = usePageContext()

  return (
    <div className="flex flex-col m-auto w-full">
      <Navbar>
        <nav className="flex gap-2">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/users">Users</NavLink>
          {user && user.isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </nav>
        <UserAuth />
      </Navbar>
      <Content>{children}</Content>
    </div>
  )
}

function Navbar({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="p-5 pt-10 shrink-0 flex items-end justify-between">
      {children}
    </div>
  )
}

function Content({ children }: { children?: JSX.Element[] }) {
  return (
    <div className="p-5 pb-10 border-l-2 border-gray-500 min-h-screen flex-grow">
      {children}
    </div>
  )
}
