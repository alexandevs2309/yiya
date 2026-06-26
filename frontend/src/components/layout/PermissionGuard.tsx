import { useAuthStore } from "@/stores/auth.store";
import type { UserPermissions } from "@/lib/types";

interface PermissionGuardProps {
  permission: keyof UserPermissions;
  children: React.ReactNode;
}

/**
 * Oculta (no deshabilita) children cuando el usuario no tiene el permiso.
 */
export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const permissions = useAuthStore((s) => s.permissions);
  if (!permissions || !permissions[permission]) return null;
  return <>{children}</>;
}
