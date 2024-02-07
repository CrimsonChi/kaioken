import { usePageContext } from "$/context/pageContext"
import { Transition, useState } from "kaioken"
import { Modal } from "./modal/Modal"
import { GoogleIcon } from "./icons/auth/GoogleIcon"
import { Avatar } from "./Avatar"
import { UserIcon } from "./icons/UserIcon"
import { NavLink } from "./atoms/NavLink"

export function UserAuth() {
  const [modalOpen, setModalOpen] = useState(false)
  const { user } = usePageContext()

  return (
    <>
      {user ? (
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 items-center">
            <span className="text-xs">{user.name}</span>
            {user.avatarUrl ? (
              <Avatar
                url={user.avatarUrl}
                size={24}
                className="px-0 py-0 rounded-full overflow-hidden border border-white border-opacity-30"
              />
            ) : (
              <UserIcon />
            )}
          </div>
          <NavLink href="/logout">Log Out</NavLink>
        </div>
      ) : (
        <button
          onclick={() => setModalOpen(true)}
          className="text-xs underline"
        >
          Log in
        </button>
      )}
      <Transition
        in={modalOpen}
        timings={[40, 150, 150, 150]}
        element={(state) => (
          <Modal state={state} close={() => setModalOpen(false)}>
            <h4 className="text-lg font-bold text-center">Log in</h4>
            <br />
            <div>
              <AuthModalProviderList />
            </div>
          </Modal>
        )}
      />
    </>
  )
}

const AuthModalProviderList = () => {
  const options = [
    {
      title: "Google",
      Icon: GoogleIcon,
    },
  ]

  return (
    <div className="flex gap flex-column items-center justify-center">
      {options.map((Option) => (
        <a
          href={`/login/${Option.title.toLowerCase()}`}
          className="flex gap-2 p-3 bg-white bg-opacity-15"
        >
          <Option.Icon />
          <small>Continue with {Option.title}</small>
        </a>
      ))}
    </div>
  )
}
