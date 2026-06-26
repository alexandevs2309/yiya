import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatRD } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { MenuItemCard } from "@/components/shared/MenuItemCard";
import { menuService } from "@/services/menu.service";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Search, X, Minus, Plus, UtensilsCrossed } from "lucide-react";
import type { Category, MenuItem } from "@/lib/types";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

// Colores por categoría para las pills
const CAT_COLORS: Record<string, string> = {
  pescados: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
  mariscos: "bg-violet-500/15 text-violet-400 ring-violet-500/30",
  carnes: "bg-red-500/15 text-red-400 ring-red-500/30",
  bebidas: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  postres: "bg-pink-500/15 text-pink-400 ring-pink-500/30",
};

function getCatKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("pescado") || n.includes("chillo") || n.includes("mero")) return "pescados";
  if (n.includes("marisco") || n.includes("camarón") || n.includes("langosta")) return "mariscos";
  if (n.includes("carne") || n.includes("pollo") || n.includes("cerdo")) return "carnes";
  if (n.includes("bebida") || n.includes("jugo") || n.includes("refresco")) return "bebidas";
  if (n.includes("postre") || n.includes("dulce")) return "postres";
  return "otros";
}

export function MenuPanel() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");

  // Modifier modal state
  const [showModifiers, setShowModifiers] = useState<MenuItem | null>(null);
  const [modQty, setModQty] = useState(1);
  const [modSelections, setModSelections] = useState<string[]>([]);
  const [modNote, setModNote] = useState("");

  const addItem = useCartStore((s) => s.addItem);

  // Debounce search 200ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw), 200);
    return () => clearTimeout(t);
  }, [searchRaw]);

  useEffect(() => {
    Promise.all([loadCategories(), loadItems()]).finally(() => setLoading(false));
  }, []);

  const loadCategories = async () => {
    try {
      const res = await menuService.listCategories();
      const cats: Category[] = res.data.results || res.data;
      const active = cats.filter((c) => c.active);
      setCategories(active);
      if (active.length > 0) setActiveCat(active[0].id);
    } catch {
      addToast({
        title: "Error",
        description: "No se pudieron cargar las categorías.",
        variant: "error",
      });
    }
  };

  const loadItems = async () => {
    try {
      const res = await menuService.listItems({ available_today: true });
      setItems(res.data.results || res.data);
    } catch {
      addToast({
        title: "Error",
        description: "No se pudieron cargar los platos.",
        variant: "error",
      });
    }
  };

  const handleAddClick = useCallback(
    (item: MenuItem) => {
      if (item.modifiers_available && item.modifiers_available.length > 0) {
        setShowModifiers(item);
        setModQty(1);
        setModSelections([]);
        setModNote("");
      } else {
        addItem({
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.effective_price,
          quantity: 1,
          modifiers: [],
          notes: "",
          hasItbis: true,
          image: item.image,
        });
      }
    },
    [addItem],
  );

  const confirmModifiers = useCallback(() => {
    if (!showModifiers) return;
    addItem({
      menuItemId: showModifiers.id,
      name: showModifiers.name,
      unitPrice: showModifiers.effective_price,
      quantity: modQty,
      modifiers: modSelections,
      notes: modNote.trim(),
      hasItbis: true,
      image: showModifiers.image,
    });
    setShowModifiers(null);
  }, [showModifiers, modQty, modSelections, modNote, addItem]);

  const filtered = useMemo(() => {
    let result = items.filter((i) => i.active !== false);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    } else if (activeCat) {
      result = result.filter((i) => i.category === activeCat);
    }
    return result;
  }, [items, activeCat, search]);

  const modifierTotal = showModifiers ? showModifiers.effective_price * modQty : 0;

  return (
    <div className="flex h-full flex-col bg-bg-base">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-border bg-bg-surface px-4 py-3 shrink-0">
        <button
          onClick={() => navigate("/tables")}
          aria-label="Volver a mesas"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-text-primary leading-none">
            Mesa {tableId?.slice(-4) ?? "—"}
          </h1>
          <p className="mt-0.5 text-[11px] text-text-tertiary">Toca un plato para agregar</p>
        </div>

        {/* Search input */}
        <div className="relative w-36 sm:w-52">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-bg-elevated pl-8 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
          />
          {searchRaw && (
            <button
              onClick={() => setSearchRaw("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category pills — ocultas durante búsqueda ── */}
      {!search.trim() && (
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-bg-surface px-4 py-2.5 scrollbar-thin shrink-0">
          {categories.map((cat) => {
            const key = getCatKey(cat.name);
            const colors =
              CAT_COLORS[key] ?? "bg-bg-elevated text-text-secondary ring-border";
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 ring-1 shrink-0",
                  isActive
                    ? colors + " ring-2"
                    : "bg-bg-elevated text-text-secondary ring-border hover:text-text-primary",
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Items grid ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-bg-elevated" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-3 text-text-tertiary"
              >
                <UtensilsCrossed className="h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium">
                  {search.trim()
                    ? `Sin resultados para "${search}"`
                    : "No hay platos disponibles"}
                </p>
                {search.trim() && (
                  <button
                    onClick={() => setSearchRaw("")}
                    className="text-xs text-accent hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ ...fastTransition, delay: i * 0.02 }}
                  >
                    <MenuItemCard item={item} onAdd={handleAddClick} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Modifiers Modal — polished ── */}
      <Modal
        open={!!showModifiers}
        onOpenChange={(o) => {
          if (!o) setShowModifiers(null);
        }}
        title=""
        className="max-w-sm p-0 overflow-hidden"
      >
        {showModifiers && (
          <div className="flex flex-col max-h-[80vh]">
            {/* Image header */}
            <div className="relative h-36 w-full bg-bg-elevated shrink-0 overflow-hidden">
              {showModifiers.image ? (
                <img
                  src={showModifiers.image}
                  alt={showModifiers.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <UtensilsCrossed className="h-12 w-12 text-text-muted" />
                </div>
              )}
              {/* Gradient overlay so text is readable over any image */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-surface/90 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-base font-bold text-text-primary leading-tight line-clamp-1">
                  {showModifiers.name}
                </h3>
                <p className="text-sm font-semibold text-accent">
                  {formatRD(showModifiers.effective_price)}
                </p>
              </div>
            </div>

            {/* Scrollable options */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {showModifiers.modifiers_available.map((mod) => (
                <div key={mod.name}>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                    {mod.name}
                  </p>

                  {mod.type === "select" && mod.options ? (
                    // Radio-style pill buttons
                    <div className="flex flex-wrap gap-2">
                      {mod.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setModSelections([opt])}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                            modSelections.includes(opt)
                              ? "bg-accent text-white"
                              : "bg-bg-elevated text-text-secondary hover:bg-bg-active border border-border",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : mod.type === "toggle" && mod.options ? (
                    // Checkbox-style pill buttons (multi-select)
                    <div className="flex flex-wrap gap-2">
                      {mod.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setModSelections((prev) =>
                              prev.includes(opt)
                                ? prev.filter((s) => s !== opt)
                                : [...prev, opt],
                            )
                          }
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                            modSelections.includes(opt)
                              ? "bg-accent/15 text-accent border border-accent/40"
                              : "bg-bg-elevated text-text-secondary hover:bg-bg-active border border-border",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Text input for free-form modifier
                    <input
                      placeholder="Ej: sin sal, poco cocido..."
                      value={modNote}
                      onChange={(e) => setModNote(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                    />
                  )}
                </div>
              ))}

              {/* Nota general opcional */}
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Nota (opcional)
                </p>
                <input
                  placeholder="Instrucción especial..."
                  value={modNote}
                  onChange={(e) => setModNote(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Footer — cantidad + confirmar */}
            <div className="border-t border-border p-4 space-y-3 shrink-0">
              {/* Quantity selector — h-12 para tablet touch */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModQty((q) => Math.max(1, q - 1))}
                    aria-label="Reducir cantidad"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-elevated border border-border text-text-secondary hover:bg-bg-active transition-colors active:scale-95"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-extrabold text-text-primary tabular-nums">
                    {modQty}
                  </span>
                  <button
                    onClick={() => setModQty((q) => q + 1)}
                    aria-label="Aumentar cantidad"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-elevated border border-border text-text-secondary hover:bg-bg-active transition-colors active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Confirm button with live price */}
              <button
                onClick={confirmModifiers}
                className="h-14 w-full rounded-xl bg-accent hover:bg-accent-hover text-sm font-bold text-white transition-all active:scale-[0.98] shadow-button"
              >
                Agregar{modQty > 1 ? ` ${modQty}×` : ""} —{" "}
                {formatRD(modifierTotal)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
