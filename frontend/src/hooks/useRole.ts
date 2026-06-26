import { useAuthStore } from "@/stores/auth.store";
import type { UserRole } from "@/lib/types";

export function useRole() {
  const user = useAuthStore((s) => s.user);
  return user?.role ?? null;
}

export function useIsRole(...roles: UserRole[]) {
  const role = useRole();
  return role !== null && roles.includes(role);
}
