import { cn, formatRD } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";
import { Plus } from "lucide-react";

// Pre-defined high quality food images mapping based on category/name for beautiful mockup view
function getFoodImage(name: string, category: string): string {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  
  if (n.includes("hamburguesa") || n.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop";
  }
  if (n.includes("fritas") || n.includes("papas")) {
    return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop";
  }
  if (n.includes("aros") || n.includes("cebolla")) {
    return "https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=400&h=300&fit=crop";
  }
  if (n.includes("batido") || n.includes("malteada") || n.includes("fresa")) {
    return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop";
  }
  if (n.includes("agua") || n.includes("botella")) {
    return "https://images.unsplash.com/photo-1608885898957-a599fb18de37?w=400&h=300&fit=crop";
  }
  if (n.includes("refresco") || n.includes("lata") || n.includes("coca")) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop";
  }
  if (c.includes("pescado") || n.includes("chillo") || n.includes("mero")) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop";
  }
  if (c.includes("marisco") || n.includes("langosta") || n.includes("camaron")) {
    return "https://images.unsplash.com/photo-1559742811-824289511f48?w=400&h=300&fit=crop";
  }
  if (c.includes("ensalada")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop";
  }
  if (c.includes("postre")) {
    return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop";
  }
  if (c.includes("bebida")) {
    return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop";
  }
  return "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop";
}

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const isSoldOut = !item.available_today;
  const imageUrl = item.image || getFoodImage(item.name, item.category);

  return (
    <button
      onClick={() => !isSoldOut && onAdd(item)}
      disabled={isSoldOut}
      className={cn(
        "relative flex w-full flex-col rounded-xl border border-border bg-bg-surface overflow-hidden text-left transition-all duration-200",
        "hover:border-border-strong hover:bg-bg-elevated hover:shadow-lg hover:scale-[1.02]",
        "active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        isSoldOut && "opacity-40 cursor-not-allowed",
      )}
    >
      {/* Image area */}
      <div className="relative h-32 w-full overflow-hidden bg-bg-elevated shrink-0">
        <img
          src={imageUrl}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />

        {/* HOY badge (cyan/teal matching caribe color) */}
        {item.is_platillo_dia && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-[#0EA5E9] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shadow-button">
            HOY
          </span>
        )}

        {/* Modifiers badge (orange/sol matching the mockup "+2") */}
        {item.modifiers_available && item.modifiers_available.length > 0 && !item.is_platillo_dia && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-[#F97316] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-button">
            +{item.modifiers_available.length}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3.5 justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary leading-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-text-tertiary line-clamp-1 capitalize">
            {item.description || item.category.toLowerCase()}
          </p>
        </div>

        {/* Price + Add button */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-extrabold text-text-primary tabular-nums">
              {formatRD(item.effective_price)}
            </span>
            {item.price_today && (
              <span className="ml-1.5 text-[10px] text-text-muted line-through tabular-nums">
                {formatRD(item.price_base)}
              </span>
            )}
          </div>
          {!isSoldOut && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-button transition-all duration-150 hover:bg-accent-hover hover:scale-110 active:scale-95">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Sold out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg-base/70">
          <span className="rounded-lg border border-danger/20 bg-danger/10 px-2.5 py-1 text-[10px] font-semibold text-danger">
            No disponible
          </span>
        </div>
      )}
    </button>
  );
}
