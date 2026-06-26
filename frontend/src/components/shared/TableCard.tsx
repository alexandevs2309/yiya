import { cn, formatMinutes } from "@/lib/utils";
import type { Table } from "@/lib/types";

interface TableCardProps {
  table: Table;
  onSelect: (table: Table) => void;
}

const statusStyles: Record<string, { border: string; bg: string; label: string }> = {
  free: {
    border: "border-status-free-dot/20 hover:border-status-free-dot/40",
    bg: "bg-status-free-bg/5 hover:bg-status-free-bg/10",
    label: "Libre",
  },
  occupied: {
    border: "border-status-occupied-dot/20 hover:border-status-occupied-dot/40",
    bg: "bg-status-occupied-bg/5 hover:bg-status-occupied-bg/10",
    label: "Ocup.",
  },
  billing: {
    border: "border-status-billing-dot/20 hover:border-status-billing-dot/40",
    bg: "bg-status-billing-bg/5 hover:bg-status-billing-bg/10",
    label: "Cuenta",
  },
};

export function TableCard({ table, onSelect }: TableCardProps) {
  const s = statusStyles[table.status] || statusStyles.free;
  const isAlert = table.status === "occupied" && table.minutes_occupied >= 30;

  return (
    <button
      onClick={() => onSelect(table)}
      className={cn(
        "relative flex w-full flex-col items-center justify-center rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-md",
        s.border,
        s.bg,
      )}
    >
      {/* Status label */}
      <span
        className={cn(
          "absolute right-2.5 top-2.5 text-[9px] font-bold uppercase tracking-wider",
          table.status === "free"
            ? "text-status-free-text"
            : table.status === "occupied"
              ? "text-status-occupied-text"
              : "text-status-billing-text",
        )}
      >
        {s.label}
      </span>

      {/* Number */}
      <span
        className={cn(
          "text-3xl font-extrabold",
          table.status === "free"
            ? "text-text-primary"
            : table.status === "occupied"
              ? "text-status-occupied-text"
              : "text-status-billing-text",
        )}
      >
        {table.number}
      </span>

      {/* Time */}
      {table.status !== "free" && (
        <span
          className={cn(
            "mt-1.5 text-xs font-semibold tabular-nums",
            isAlert ? "text-danger" : "text-text-secondary",
          )}
        >
          {formatMinutes(table.minutes_occupied)}
        </span>
      )}

      {/* Alert pulse */}
      {isAlert && (
        <span className="mt-2 rounded-full bg-danger px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
          TARDE
        </span>
      )}
    </button>
  );
}
