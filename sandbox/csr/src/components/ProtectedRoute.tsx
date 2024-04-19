import { navigate } from "kaioken"

interface ProtectedRouteProps {
  children?: JSX.Children
  enabled: boolean
  redirectPath: string
}

export function ProtectedRoute({
  children,
  enabled,
  redirectPath,
}: ProtectedRouteProps) {
  return enabled ? children : navigate(redirectPath)
}
