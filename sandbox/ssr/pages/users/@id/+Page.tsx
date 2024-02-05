import { Avatar } from "$/components/Avatar"
import { LocationIcon } from "$/components/icons/LocationIcon"
import type { ServerProps } from "./+data"

export default function ({ user }: ServerProps) {
  return (
    <>
      <div className="flex gap-4 py-4 items-center ">
        <Avatar url={user.image} size={200} />
        <h1 className="text-xl font-bold">
          <span className="block">
            {user.firstName} {user.lastName}
          </span>
          <span className="flex-inline items-center px-2 py-1 bg-emerald-700 text-while rounded text-xs font-light">
            ({user.gender}, {user.age})
          </span>
        </h1>
      </div>
      <hr className="opacity-50" />
      <AddressDisplay address={user.address} />
    </>
  )
}

type AddressData = ServerProps["user"]["address"]

function AddressDisplay({ address }: { address: AddressData }) {
  return (
    <div className="flex p-2 items-center">
      <div className="flex gap-2 items-center">
        <LocationIcon className="inline stroke-emerald-500" />
        <span className="text-sm">
          {address.address}, {address.city}, {address.state}
        </span>
      </div>
    </div>
  )
}
