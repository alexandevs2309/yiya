import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import type { UserRole } from "@/lib/types";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: string;
}

export function RoleGuard({ roles, children, fallback = "/login" }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
