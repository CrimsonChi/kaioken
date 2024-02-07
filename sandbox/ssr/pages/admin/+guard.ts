import type { GuardAsync } from "vike/types"
import { render } from "vike/abort"

export { guard }
const guard: GuardAsync = async (pageContext): ReturnType<GuardAsync> => {
  if (!pageContext.user?.isAdmin) throw render(403, { notAdmin: true })
}
