import { navigate } from "kaioken"

interface ProtectedRouteProps {
  children?: JSX.Element
  enabled: boolean
  redirectPath: string
}

export function ProtectedRoute({
  children,
  enabled,
  redirectPath,
}: ProtectedRouteProps) {
  if (enabled && children) return children
  setTimeout(() => navigate(redirectPath))
  return null
}
