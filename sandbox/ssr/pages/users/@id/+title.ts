import { PageContext } from "vike/types"
import type { ServerProps } from "./+data"

export default function ({ data }: PageContext<ServerProps>) {
  const { user } = data
  return `Users - ${user.firstName} ${user.lastName}`
}
