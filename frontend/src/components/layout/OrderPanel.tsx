import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Minus, Plus, Trash2, Receipt, Users, MoreHorizontal, User, SendHorizontal } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";
import { useTablesStore } from "@/stores/tables.store";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/components/ui/toast";
import { ordersService } from "@/services/orders.service";
import { formatRD, calcITBIS, calcTotal } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings.store";
import { printOrderTicket } from "@/lib/printHelper";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

// Fallback images map for thumbnails in the cart list
function getCartItemImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("hamburguesa") || n.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=80&h=80&fit=crop";
  }
  if (n.includes("fritas") || n.includes("papas")) {
    return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=80&h=80&fit=crop";
  }
  if (n.includes("aros") || n.includes("cebolla")) {
    return "https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=80&h=80&fit=crop";
  }
  if (n.includes("batido") || n.includes("malteada") || n.includes("fresa")) {
    return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=80&h=80&fit=crop";
  }
  if (n.includes("agua") || n.includes("botella")) {
    return "https://images.unsplash.com/photo-1608885898957-a599fb18de37?w=80&h=80&fit=crop";
  }
  if (n.includes("refresco") || n.includes("lata") || n.includes("coca")) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=80&h=80&fit=crop";
  }
  if (n.includes("chillo") || n.includes("mero") || n.includes("pescado")) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=80&h=80&fit=crop";
  }
  if (n.includes("langosta") || n.includes("camaron")) {
    return "https://images.unsplash.com/photo-1559742811-824289511f48?w=80&h=80&fit=crop";
  }
  return "https://images.unsplash.com/photo-1544025162-d76694265947?w=80&h=80&fit=crop";
}

export function OrderPanel() {
  const navigate = useNavigate();
  const { items, tableId, activeOrderId, setActiveOrderId, updateItem, removeItem, clear } = useCartStore();
  const tables = useTablesStore((s) => s.tables);
  const user = useAuthStore((s) => s.user);
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"cuenta" | "acciones" | "cliente">("cuenta");
  const [sending, setSending] = useState(false);

  const activeTable = tables.find((t) => t.id === tableId);
  const hasItems = items.length > 0;

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itbisRate = useSettingsStore((s) => s.settings.itbisRate) / 100;
  const itbis = calcITBIS(subtotal, itbisRate);
  const total = calcTotal(subtotal, itbis);

  const handleSendToKitchen = async () => {
    if (!tableId || !user || items.length === 0) return;
    setSending(true);
    try {
      const orderData = {
        table: tableId,
        waitress: user.id,
        diners: 1,
        items: items.map((i) => ({
          menu_item: i.menuItemId,
          name: i.name,
          unit_price: i.unitPrice,
          quantity: i.quantity,
          modifiers: i.modifiers,
          notes: i.notes,
        })),
      };
      const res = await ordersService.create(orderData);
      await ordersService.submitToKitchen(
        res.data.id,
        res.data.items.map((i: any) => i.id),
      );
      printOrderTicket({
        tableNumber: activeTable?.number ?? tableId ?? "",
        items: items.map((i) => ({ qty: i.quantity, name: i.name, notes: i.notes, modifiers: Array.isArray(i.modifiers) ? i.modifiers.join(", ") : i.modifiers })),
        waitressName: user.first_name || user.username,
        type: "kitchen",
      });
      setActiveOrderId(res.data.id);
      clear();
      addToast({ title: "✅ Enviado a cocina", description: `Mesa #${activeTable?.number} — ${items.length} plato${items.length > 1 ? "s" : ""}`, variant: "success" });
    } catch {
      addToast({ title: "Error", description: "No se pudo enviar a cocina", variant: "error" });
    } finally {
      setSending(false);
    }
  };

  // No active table — empty state
  if (!tableId || !activeTable) {
    return (
      <aside className="w-[340px] shrink-0 bg-bg-surface border-l border-border flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Orden activa
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <ShoppingCart className="h-10 w-10 text-text-muted mb-3 animate-pulse" />
          <p className="text-sm font-medium text-text-secondary">No hay orden activa</p>
          <p className="mt-1 text-xs text-text-muted">
            Selecciona una mesa y agrega platos para comenzar
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[340px] shrink-0 bg-bg-surface border-l border-border flex flex-col">
      {/* Header — Mesa info */}
      <div className="border-b border-border px-4 py-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-text-primary">
                Mesa #{activeTable.number}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
            </div>
            <div className="text-[11px] text-text-muted mt-0.5 font-medium">
              {activeTable.capacity || 4} personas
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                activeTable.status === "occupied"
                  ? "bg-[#F97316]/10 text-[#F97316]" // Orange for 'En curso' matching mockup
                  : activeTable.status === "billing"
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
              }`}
            >
              {activeTable.status === "occupied"
                ? "En curso"
                : activeTable.status === "billing"
                  ? "Cuenta"
                  : "Libre"}
            </span>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-elevated text-text-secondary transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs: Cuenta | Acciones | Cliente */}
        <div className="flex rounded-lg bg-bg-elevated p-1 text-xs">
          <button
            onClick={() => setActiveTab("cuenta")}
            className={`flex-1 py-1.5 rounded-md font-bold text-center transition-colors ${
              activeTab === "cuenta" ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Cuenta
          </button>
          <button
            onClick={() => setActiveTab("acciones")}
            className={`flex-1 py-1.5 rounded-md font-bold text-center transition-colors ${
              activeTab === "acciones" ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Acciones
          </button>
          <button
            onClick={() => setActiveTab("cliente")}
            className={`flex-1 py-1.5 rounded-md font-bold text-center transition-colors ${
              activeTab === "cliente" ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Cliente
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
        {activeTab === "cuenta" && (
          <AnimatePresence mode="popLayout">
            {!hasItems ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShoppingCart className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-text-muted">
                  {activeOrderId ? "Productos ya enviados a cocina" : "Agrega platos desde el menú"}
                </p>
              </div>
            ) : (
              items.map((item, i) => {
                const img = item.image || getCartItemImage(item.name);
                return (
                  <motion.div
                    key={`${item.menuItemId}-${i}`}
                    layout
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={fastTransition}
                    className="flex items-center gap-2.5 rounded-xl bg-bg-surface border border-border/50 p-2 hover:bg-bg-elevated transition-colors"
                  >
                    {/* Thumbnail */}
                    <img
                      src={img}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg object-cover bg-bg-elevated shrink-0"
                    />

                    {/* Name + modifiers */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {item.name}
                      </p>
                      {item.modifiers.length > 0 && (
                        <p className="text-[10px] text-text-tertiary truncate">
                          {item.modifiers.join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-text-tertiary italic truncate">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {/* Price, Quantity, Delete */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-text-primary tabular-nums">
                        {formatRD(item.unitPrice * item.quantity)}
                      </span>
                      
                      {/* Compact quantity display/controls */}
                      <div className="flex items-center rounded-lg bg-bg-elevated border border-border p-0.5">
                        <button
                          onClick={() => {
                            if (item.quantity <= 1) removeItem(i);
                            else updateItem(i, { quantity: item.quantity - 1 });
                          }}
                          className="h-5 w-5 flex items-center justify-center text-text-secondary hover:text-text-primary rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 text-xs font-extrabold text-text-primary min-w-[16px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItem(i, { quantity: item.quantity + 1 })}
                          className="h-5 w-5 flex items-center justify-center text-text-secondary hover:text-text-primary rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete trash button */}
                      <button
                        onClick={() => removeItem(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        )}

        {activeTab === "acciones" && (
          <div className="flex flex-col gap-2 py-4">
            <p className="text-xs text-text-muted text-center">Acciones rápidas de mesa</p>
            <button className="w-full rounded-xl bg-bg-elevated border border-border p-3 text-xs font-bold text-text-primary text-center hover:bg-bg-active transition-colors">
              Transferir Mesa
            </button>
            <button className="w-full rounded-xl bg-bg-elevated border border-border p-3 text-xs font-bold text-text-primary text-center hover:bg-bg-active transition-colors">
              Dividir Cuenta
            </button>
            <button className="w-full rounded-xl bg-bg-elevated border border-border p-3 text-xs font-bold text-danger text-center hover:bg-danger/10 transition-colors">
              Cancelar Comanda
            </button>
          </div>
        )}

        {activeTab === "cliente" && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 rounded-xl bg-bg-elevated p-3 border border-border">
              <User className="h-5 w-5 text-text-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text-primary">Cliente General</p>
                <p className="text-[10px] text-text-muted">Sin RNC / Datos fiscales</p>
              </div>
            </div>
            <button className="w-full rounded-xl bg-accent text-white p-3 text-xs font-bold text-center hover:bg-accent-hover transition-colors">
              Asociar RNC / Cliente
            </button>
          </div>
        )}
      </div>

      {/* Footer — Totals + CTA */}
      {hasItems && (
        <div className="border-t border-border px-4 py-3.5 space-y-3 shrink-0">
          {/* Subtotal + ITBIS */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium">{formatRD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>ITBIS (18%)</span>
              <span className="tabular-nums font-medium">{formatRD(itbis)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-text-secondary">Total</span>
            <motion.span
              key={total}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 0.15 }}
              className="text-xl font-extrabold text-[#3B82F6] tabular-nums leading-none"
            >
              {formatRD(total)}
            </motion.span>
          </div>

          {/* Enviar a cocina */}
          <button
            onClick={handleSendToKitchen}
            disabled={sending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors shadow-button active:scale-[0.98]"
          >
            <SendHorizontal className="h-4 w-4" />
            {sending ? "Enviando..." : `Enviar a cocina · ${formatRD(total)}`}
          </button>

          {/* Pagar cuenta — solo si ya hay orden en cocina */}
          {activeOrderId && (
            <button
              onClick={() => navigate(`/checkout/${activeOrderId}`)}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-bg-elevated hover:bg-bg-active px-4 text-xs font-bold text-text-secondary transition-colors group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5" />
                <span>Pagar cuenta</span>
              </div>
              <span className="transition-transform group-hover:translate-x-0.5">&gt;</span>
            </button>
          )}
        </div>
      )}

      {/* Footer sin items — solo mostrar pagar si hay orden activa */}
      {!hasItems && activeOrderId && (
        <div className="border-t border-border px-4 py-3.5 shrink-0">
          <button
            onClick={() => navigate(`/checkout/${activeOrderId}`)}
            className="flex h-11 w-full items-center justify-between rounded-xl bg-accent hover:bg-accent-hover px-4 text-xs font-bold text-white transition-colors group shadow-button active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Pagar cuenta</span>
            </div>
            <span className="transition-transform group-hover:translate-x-1">&gt;</span>
          </button>
        </div>
      )}
    </aside>
  );
}
