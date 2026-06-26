import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart.store";
import { formatRD, calcITBIS, calcTotal } from "@/lib/utils";
import { Minus, Plus, Trash2, SendHorizontal, Receipt, Users } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface CartPanelProps {
  diners: number;
  onDinersChange: (n: number) => void;
  onSendToKitchen: () => void;
  onRequestBill: () => void;
  sending: boolean;
  hasActiveOrder: boolean;
}

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

export function CartPanel({ diners, onDinersChange, onSendToKitchen, onRequestBill, sending, hasActiveOrder }: CartPanelProps) {
  const { items, updateItem, removeItem } = useCartStore();
  const isOnline = useNetworkStatus();

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itbis = calcITBIS(subtotal);
  const total = calcTotal(subtotal, itbis);

  const canRequestBill = hasActiveOrder || (!hasActiveOrder && items.length > 0);

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

        {/* N4: Subtotal e ITBIS (pequeño, secundario) */}
        <div className="flex justify-between text-[11px] text-text-tertiary">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatRD(subtotal)}</span>
        </div>
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
          {sending ? "Enviando..." : items.length > 0 ? "Enviar a cocina" : "Sin productos nuevos"}
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
      </div>
    </div>
  );
}
