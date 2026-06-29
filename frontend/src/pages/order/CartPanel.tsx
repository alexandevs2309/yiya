import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart.store";
import { formatRD, calcITBIS, calcTotal } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings.store";
import {
  Minus, Plus, Trash2, SendHorizontal, Receipt, Users,
  Percent, Ban, AlertTriangle, Scissors,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface CartPanelProps {
  diners: number;
  onDinersChange: (n: number) => void;
  onSendToKitchen: () => void;
  onRequestBill: () => void;
  onVoidOrder: (reason: string) => void;
  onApplyDiscount: (percentage: number, reason: string) => void;
  onSplitOrder?: () => void;
  sending: boolean;
  hasActiveOrder: boolean;
  activeOrder?: any;
  permissions?: any;
}

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

export function CartPanel({
  diners, onDinersChange, onSendToKitchen, onRequestBill,
  onVoidOrder, onApplyDiscount, onSplitOrder, sending, hasActiveOrder,
  activeOrder, permissions,
}: CartPanelProps) {
  const { items, updateItem, removeItem } = useCartStore();
  const isOnline = useNetworkStatus();

  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [voidReason, setVoidReason] = useState("");

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // Si hay orden activa con descuento, usar esos valores
  const existingDiscount = activeOrder?.discount_amount ? parseFloat(activeOrder.discount_amount) : 0;
  const existingDiscountPct = activeOrder?.discount_percentage ? parseFloat(activeOrder.discount_percentage) : 0;

  const effectiveSubtotal = subtotal > 0 ? subtotal : (activeOrder?.subtotal ? parseFloat(activeOrder.subtotal) : 0);
  const discountedSubtotal = effectiveSubtotal - existingDiscount;
  const itbisRate = useSettingsStore((s) => s.settings.itbisRate) / 100;
  const itbis = calcITBIS(discountedSubtotal > 0 ? discountedSubtotal : effectiveSubtotal, itbisRate);
  const total = calcTotal(discountedSubtotal > 0 ? discountedSubtotal : effectiveSubtotal, itbis);

  const canRequestBill = hasActiveOrder || (!hasActiveOrder && items.length > 0);
  const canApplyDiscount = permissions?.can_apply_discount && hasActiveOrder;
  const canVoidOrder = permissions?.can_void_orders && hasActiveOrder;

  const handleDiscountSubmit = () => {
    const pct = parseFloat(discountPercent);
    if (isNaN(pct) || pct <= 0 || pct > 100) return;
    onApplyDiscount(pct, discountReason);
    setShowDiscountModal(false);
    setDiscountPercent("");
    setDiscountReason("");
  };

  const handleVoidSubmit = () => {
    if (!voidReason.trim()) return;
    onVoidOrder(voidReason);
    setShowVoidModal(false);
    setVoidReason("");
  };

  return (
    <div className="flex h-full flex-col border-t border-border bg-bg-surface md:border-l md:border-t-0">
      {/* N4: Header — mesa y comensales */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Carrito
        </span>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-text-tertiary" />
          <button
            onClick={() => onDinersChange(Math.max(1, diners - 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-secondary text-text-tertiary text-xs transition-colors"
          >−</button>
          <span className="w-4 text-center text-xs font-semibold tabular-nums text-text-secondary">{diners}</span>
          <button
            onClick={() => onDinersChange(diners + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-secondary text-text-tertiary text-xs transition-colors"
          >+</button>
        </div>
      </div>

      {/* N4: Offline warning */}
      {!isOnline && (
        <div className="mx-3 mt-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[10px] font-semibold text-warning">
          Solo efectivo disponible
        </div>
      )}

      {/* N4: Active order notice */}
      {hasActiveOrder && items.length === 0 && (
        <div className="mx-3 mt-2 rounded-lg bg-bg-elevated px-2.5 py-1.5 text-[10px] font-medium text-text-tertiary">
          Orden activa — pedir cuenta o agregar productos
        </div>
      )}

      {/* Discount badge */}
      {existingDiscountPct > 0 && (
        <div className="mx-3 mt-2 rounded-lg bg-samana/10 px-2.5 py-1.5 flex items-center gap-1.5">
          <Percent className="h-3 w-3 text-samana" />
          <span className="text-[10px] font-semibold text-samana">
            Descuento {existingDiscountPct}% aplicado (-{formatRD(existingDiscount)})
          </span>
        </div>
      )}

      {/* N1: Items — qué lleva la orden */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {items.length === 0 && !hasActiveOrder ? (
            <p className="mt-12 text-center text-xs text-text-tertiary">Carrito vacío</p>
          ) : items.length === 0 && hasActiveOrder ? (
            <p className="mt-12 text-center text-xs text-text-tertiary">Productos ya enviados a cocina</p>
          ) : (
            items.map((item, i) => (
              <motion.div
                key={`${item.menuItemId}-${i}`}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={fastTransition}
                className="flex items-center gap-2 rounded-lg bg-bg-elevated p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                  {/* N3: Modificadores */}
                  {item.modifiers.length > 0 && (
                    <p className="text-[11px] text-text-tertiary">{item.modifiers.join(" · ")}</p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-text-tertiary italic">"{item.notes}"</p>
                  )}
                </div>
                {/* N2: Cantidad y precio */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (item.quantity <= 1) removeItem(i);
                      else updateItem(i, { quantity: item.quantity - 1 });
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-active text-text-tertiary transition-colors"
                  >
                    {item.quantity > 1 ? <Minus className="h-3 w-3" /> : <Trash2 className="h-3 w-3 text-danger" />}
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums text-text-primary">{item.quantity}</span>
                  <button
                    onClick={() => updateItem(i, { quantity: item.quantity + 1 })}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-active text-text-tertiary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {/* N2: Precio */}
                <span className="text-sm font-bold text-text-primary tabular-nums w-16 text-right">
                  {formatRD(item.unitPrice * item.quantity)}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* N1: TOTAL + acciones — SIEMPRE VISIBLE */}
      <div className="border-t border-border px-4 py-3 space-y-3">
        {/* N1: TOTAL — 2x más grande que cualquier otro texto */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-text-secondary">Total</span>
          <motion.span
            key={total}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.2 }}
            className="text-3xl font-extrabold text-text-primary tabular-nums leading-none"
          >
            {formatRD(total)}
          </motion.span>
        </div>

        {/* N4: Subtotal, descuento e ITBIS (pequeño, secundario) */}
        <div className="flex justify-between text-[11px] text-text-tertiary">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatRD(effectiveSubtotal)}</span>
        </div>
        {existingDiscount > 0 && (
          <div className="flex justify-between text-[11px] text-samana -mt-2">
            <span>Descuento ({existingDiscountPct}%)</span>
            <span className="tabular-nums">-{formatRD(existingDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] text-text-tertiary -mt-2">
          <span>ITBIS 18%</span>
          <span className="tabular-nums">{formatRD(itbis)}</span>
        </div>

        {/* N1: Botón principal — Enviar a cocina */}
        <button
          onClick={onSendToKitchen}
          disabled={items.length === 0 || sending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <SendHorizontal className="h-4 w-4" />
          {sending ? "Enviando..." : hasActiveOrder && items.length > 0 ? "Agregar a orden" : items.length > 0 ? "Enviar a cocina" : "Sin productos nuevos"}
        </button>

        {/* N3: Botón secundario — Pedir cuenta */}
        <button
          onClick={onRequestBill}
          disabled={!canRequestBill || sending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated text-xs font-semibold text-text-secondary hover:bg-bg-active disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Receipt className="h-3.5 w-3.5" />
          {sending ? "Enviando..." : "Pedir cuenta"}
        </button>

        {/* Dividir Cuenta */}
        {hasActiveOrder && activeOrder?.items?.length > 1 && onSplitOrder && (
          <button
            onClick={onSplitOrder}
            disabled={sending}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/5 text-[11px] font-semibold text-sky-400 hover:bg-sky-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all mt-1"
          >
            <Scissors className="h-3.5 w-3.5" />
            Dividir Cuenta
          </button>
        )}

        {/* Acciones secundarias: Descuento + Anular */}
        {(canApplyDiscount || canVoidOrder) && (
          <div className="flex gap-2">
            {canApplyDiscount && (
              <button
                onClick={() => setShowDiscountModal(true)}
                disabled={sending}
                className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg border border-samana/30 bg-samana/5 text-[11px] font-semibold text-samana hover:bg-samana/10 disabled:opacity-30 transition-all"
              >
                <Percent className="h-3 w-3" />
                Descuento
              </button>
            )}
            {canVoidOrder && (
              <button
                onClick={() => setShowVoidModal(true)}
                disabled={sending}
                className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 text-[11px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-30 transition-all"
              >
                <Ban className="h-3 w-3" />
                Anular
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Descuento */}
      <AnimatePresence>
        {showDiscountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDiscountModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-bg-surface p-6 space-y-4 shadow-xl border border-border"
            >
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-samana" />
                <h3 className="text-lg font-bold text-text-primary">Aplicar descuento</h3>
              </div>
              <div className="space-y-3">
                {/* Quick presets */}
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPercent(String(pct))}
                      className={`flex-1 h-10 rounded-lg border text-sm font-bold transition-all ${
                        discountPercent === String(pct)
                          ? "border-samana bg-samana/10 text-samana"
                          : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-active"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Porcentaje personalizado"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-samana/50"
                />
                <input
                  type="text"
                  placeholder="Razón del descuento"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-samana/50"
                />
                {permissions?.discount_limit && (
                  <p className="text-[10px] text-text-tertiary">
                    Tu límite: {permissions.discount_limit}%
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-active transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDiscountSubmit}
                  disabled={!discountPercent || !discountReason.trim()}
                  className="flex-1 h-10 rounded-lg bg-samana text-sm font-bold text-white hover:bg-samana/90 disabled:opacity-30 transition-all"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Anular orden */}
      <AnimatePresence>
        {showVoidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowVoidModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-bg-surface p-6 space-y-4 shadow-xl border border-border"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <h3 className="text-lg font-bold text-text-primary">Anular orden</h3>
              </div>
              <p className="text-sm text-text-secondary">
                Esta acción no se puede deshacer. Se liberará la mesa y quedará registrado en auditoría.
              </p>
              <textarea
                placeholder="Justificación obligatoria..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-danger/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-active transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVoidSubmit}
                  disabled={!voidReason.trim()}
                  className="flex-1 h-10 rounded-lg bg-danger text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-30 transition-all"
                >
                  Confirmar anulación
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
