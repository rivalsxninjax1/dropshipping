import { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

type RequireRoleProps = {
  roles: string[]
  fallback?: string
}

export default function RequireRole({ roles, fallback = '/', children }: PropsWithChildren<RequireRoleProps>) {
  const location = useLocation()
  const { accessToken, user } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const normalizedRole = (user.role ?? (user.is_staff ? 'staff' : 'customer')).toLowerCase()
  const isAllowed = roles.map(role => role.toLowerCase()).includes(normalizedRole)

  if (!isAllowed) {
    return <Navigate to={fallback} replace />
  }

  return <>{children ?? <Outlet />}</>
}
