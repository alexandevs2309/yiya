import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/tokens";

interface CategoryCardProps {
  name: string;
  count: number;
  icon: React.ReactNode;
  categoryKey: keyof typeof CATEGORY_COLORS;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryCard({ name, count, icon, categoryKey, isActive, onClick }: CategoryCardProps) {
  const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.otros;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-h-[80px] w-full min-w-[120px] transition-all duration-150",
        isActive
          ? "ring-2 ring-offset-2 ring-offset-bg-surface ring-accent shadow-lg"
          : "hover:shadow-card hover:-translate-y-0.5",
      )}
      style={{
        backgroundColor: colors.bg,
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
        {icon}
      </div>
      <span className="text-sm font-semibold text-white">{name}</span>
      <span className="text-xs font-medium text-white/70">{count} artículos</span>
      {isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-2 w-2 rounded-full bg-white" />
      )}
    </button>
  );
}