import { PageProps, UserData } from "./+data"

export default function ({ data }: { data: PageProps }) {
  console.log("users page", data)
  return (
    <>
      <h1>Users</h1>
      {data.users.map((user) => (
        <UserCard user={user} />
      ))}
      <div>
        {data.page > 1 && <a href={`users?page=${data.page - 1}`}>Prev</a>}
        <a href={`users?page=${data.page + 1}`}>Next</a>
      </div>
    </>
  )
}

function UserCard({ user }: { user: UserData }) {
  return (
    <div className="flex gap-2 mb-4">
      <a href={`/users/${user.id}`} className="text-emerald-500">
        {user.firstName} {user.lastName}
      </a>
    </div>
  )
}
