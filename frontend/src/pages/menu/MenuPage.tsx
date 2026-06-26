import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryCard } from "@/components/shared/CategoryCard";
import { MenuItemCard } from "@/components/shared/MenuItemCard";
import { menuService } from "@/services/menu.service";
import { useCartStore } from "@/stores/cart.store";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Flame, Search, ScanLine, Grid, List, ChevronDown, MoreHorizontal } from "lucide-react";

import type { Category, MenuItem } from "@/lib/types";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

export default function MenuPage() {
  const getCategoryIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Utensils;
    return <IconComponent className="h-5 w-5 text-white" />;
  };

  const getCategoryKey = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes("pescado")) return "pescados";
    if (norm.includes("marisco") || norm.includes("camarón")) return "mariscos";
    if (norm.includes("carne") || norm.includes("pollo") || norm.includes("cerdo")) return "carnes";
    if (norm.includes("bebida") || norm.includes("jugo") || norm.includes("refresco")) return "bebidas";
    if (norm.includes("postre") || norm.includes("dulce")) return "postres";
    return "otros";
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchQuery = useUIStore((s) => s.searchQuery);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        menuService.listCategories(),
        menuService.listItems(),
      ]);
      const cats: Category[] = catRes.data.results || catRes.data;
      const allItems: MenuItem[] = itemRes.data.results || itemRes.data;
      setCategories(cats);
      setItems(allItems);
    } catch {
      // toast error
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (item: MenuItem) => {
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
  };

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Populares = platillo del día
  const populares = useMemo(
    () => items.filter((i) => i.is_platillo_dia && i.available_today),
    [items],
  );

  // Filtered items by category + search
  const filtered = useMemo(() => {
    let result = items.filter((i) => i.active);
    if (activeCat) result = result.filter((i) => i.category === activeCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, activeCat, searchQuery]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        {/* Skeleton categories */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] w-[120px] shrink-0 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
        {/* Internal Header */}
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xl font-bold text-text-primary hover:bg-bg-elevated transition-colors">
            <span>Almuerzo</span>
            <ChevronDown className="h-5 w-5 text-text-secondary" />
          </button>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl bg-bg-elevated hover:bg-bg-active border border-border px-3.5 py-2 text-xs font-semibold text-text-primary transition-all active:scale-[0.98]">
              <ScanLine className="h-4 w-4 text-text-secondary" />
              <span>Escanear código</span>
            </button>
            <div className="flex items-center rounded-xl bg-bg-elevated border border-border p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === "grid" ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === "list" ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Cards row */}
        <div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {categories.filter((c) => c.active).map((cat) => (
              <CategoryCard
                key={cat.id}
                name={cat.name}
                count={categoryCounts[cat.id] || 0}
                isActive={activeCat === cat.id}
                icon={getCategoryIcon(cat.icon)}
                categoryKey={getCategoryKey(cat.name) as any}
                onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
              />
            ))}
            
            {/* Más categorías card */}
            <button
              onClick={() => {}}
              className="relative flex flex-col items-start rounded-xl p-3.5 min-w-[120px] text-left transition-all duration-150 bg-bg-elevated hover:bg-bg-active border border-border active:scale-[0.97]"
            >
              <MoreHorizontal className="h-5 w-5 text-text-secondary mb-2" />
              <span className="text-sm font-bold text-text-primary leading-tight">Más</span>
              <span className="text-[11px] font-medium text-text-muted mt-0.5">categorías</span>
            </button>
          </div>
        </div>

        {/* Populares section */}
        {populares.length > 0 && !activeCat && !searchQuery && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-danger" />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Populares</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {populares.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...fastTransition, delay: i * 0.03 }}
                >
                  <MenuItemCard item={item} onAdd={handleAddItem} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Todas las categorías section */}
        <section className="space-y-4">
          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">Todas las categorías</h2>
            
            {/* Category filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setActiveCat(null)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !activeCat
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                Todas
              </button>
              {categories.filter((c) => c.active).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeCat === cat.id
                      ? "bg-accent text-white"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items grid */}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <Search className="h-8 w-8 text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-secondary">No se encontraron platos</p>
                <p className="text-xs text-text-muted mt-1">Intenta con otra categoría o búsqueda</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ ...fastTransition, delay: i * 0.02 }}
                  >
                    <MenuItemCard item={item} onAdd={handleAddItem} />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
