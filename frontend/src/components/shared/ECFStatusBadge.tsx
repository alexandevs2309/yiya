import { cn } from "@/lib/utils";
import type { ECFStatus } from "@/lib/types";

const styles: Record<ECFStatus, string> = {
  pending: "bg-muted text-text-secondary",
  approved: "bg-status-free-bg text-status-free-text",
  rejected: "bg-status-billing-bg text-status-billing-text",
  failed: "bg-status-billing-bg text-status-billing-text",
};

const labels: Record<ECFStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  failed: "Fallido",
};

export function ECFStatusBadge({ status }: { status: ECFStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
