import { LocationIcon } from "../../../components/icons/LocationIcon"
import type { AddressData, UserData } from "./+data"

export default function ({ data: user }: { data: UserData }) {
  return (
    <>
      <div className="flex gap-4 py-4 items-center ">
        <Avatar url={user.image} />
        <h1 className="text-xl font-bold flex w-full items-start">
          {user.firstName} {user.lastName}
          <span className="flex items-center px-2 py-1 bg-emerald-700 text-while rounded text-xs font-light ml-auto">
            ({user.gender}, {user.age})
          </span>
        </h1>
      </div>
      <hr className="opacity-50" />
      <AddressDisplay address={user.address} />
    </>
  )
}

function AddressDisplay({ address }: { address: AddressData }) {
  return (
    <div className="flex gap-2 p-2 justify-between items-center">
      <div className="flex gap-2 items-center">
        <LocationIcon className="inline stroke-emerald-500" />
        <span className="text-sm">{address.address}</span>
      </div>
      <span className="text-sm">
        {address.city} {address.state}
      </span>
    </div>
  )
}

function Avatar({ url }: { url: string }) {
  return (
    <div className="flex p-2 rounded-full bg-white bg-opacity-15 w-fit">
      <img src={url} width={50} height={50} />
    </div>
  )
}
