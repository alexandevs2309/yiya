import { useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { formatRD } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { ordersService } from "@/services/orders.service";
import { useToast } from "@/components/ui/toast";

interface SplitModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export function SplitModal({ order, onClose, onSuccess }: SplitModalProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Left side: original order items with remaining quantities
  // We initialize the quantities as the actual quantity in the order items list
  const [leftItems, setLeftItems] = useState(() =>
    (order.items || []).map((i) => ({
      id: i.id,
      name: i.name,
      unitPrice: parseFloat(i.unit_price.toString()),
      quantity: i.quantity,
      originalQuantity: i.quantity,
    }))
  );

  // Right side: items being split to the new order
  const [rightItems, setRightItems] = useState<{ id: string; name: string; unitPrice: number; quantity: number }[]>([]);

  const handleMoveRight = (itemId: string) => {
    setLeftItems((prevLeft) =>
      prevLeft.map((item) => {
        if (item.id === itemId && item.quantity > 0) {
          // Add to right side
          setRightItems((prevRight) => {
            const existing = prevRight.find((ri) => ri.id === itemId);
            if (existing) {
              return prevRight.map((ri) =>
                ri.id === itemId ? { ...ri, quantity: ri.quantity + 1 } : ri
              );
            } else {
              return [...prevRight, { id: item.id, name: item.name, unitPrice: item.unitPrice, quantity: 1 }];
            }
          });
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      })
    );
  };

  const handleMoveLeft = (itemId: string) => {
    setRightItems((prevRight) => {
      const target = prevRight.find((ri) => ri.id === itemId);
      if (target && target.quantity > 0) {
        // Decrement on right side
        const updatedRight = prevRight
          .map((ri) => (ri.id === itemId ? { ...ri, quantity: ri.quantity - 1 } : ri))
          .filter((ri) => ri.quantity > 0);

        // Put back on left side
        setLeftItems((prevLeft) =>
          prevLeft.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
        return updatedRight;
      }
      return prevRight;
    });
  };

  const handleConfirmSplit = async () => {
    const payload = rightItems.map((ri) => ({
      item_id: ri.id,
      quantity: ri.quantity,
    }));

    if (payload.length === 0) {
      addToast({
        title: "Selección vacía",
        description: "Mueve al menos un plato a la nueva cuenta.",
        variant: "error",
      });
      return;
    }

    // Ensure we are not splitting all items
    const totalLeft = leftItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalLeft === 0) {
      addToast({
        title: "Operación no permitida",
        description: "Debe quedar al menos un artículo en la cuenta original.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await ordersService.split(order.id, payload);
      addToast({
        title: "Cuenta Dividida",
        description: "Se ha creado una nueva comanda con los platos seleccionados.",
        variant: "success",
      });
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error || "No se pudo dividir la comanda.";
      addToast({
        title: "Error al dividir",
        description: msg,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-3xl bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border bg-bg-base/30 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Dividir Cuenta — Mesa #{order.table_number || order.table}
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Transfiere artículos de la cuenta original a una cuenta nueva.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content columns */}
        <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-border">
          {/* Original Order (Left) */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <h4 className="text-xs font-bold text-[#F43F5E] mb-3 uppercase tracking-wider">
              Cuenta Original
            </h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {leftItems.map((item) => {
                if (item.originalQuantity === 0) return null;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border border-border/60 transition-colors bg-bg-elevated/5 ${
                      item.quantity === 0 ? "opacity-40" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-text-primary truncate">{item.name}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {item.quantity} de {item.originalQuantity} restantes · {formatRD(item.unitPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={item.quantity === 0 || loading}
                      onClick={() => handleMoveRight(item.id)}
                      className="p-2 rounded-lg bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 border border-border"
                      title="Mover 1 a la nueva cuenta"
                    >
                      <ArrowRight className="h-3.5 w-3.5 animate-none" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Order (Right) */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-bg-elevated/5">
            <h4 className="text-xs font-bold text-success mb-3 uppercase tracking-wider">
              Nueva Cuenta
            </h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {rightItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-border rounded-2xl">
                  <p className="text-xs text-text-muted">La nueva cuenta está vacía.</p>
                  <p className="text-[9px] text-text-tertiary mt-1">
                    Usa las flechas de la izquierda para transferir artículos.
                  </p>
                </div>
              ) : (
                rightItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg-surface"
                  >
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleMoveLeft(item.id)}
                      className="p-2 rounded-lg bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 border border-border"
                      title="Devolver 1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1 pl-3 text-right">
                      <p className="text-xs font-bold text-text-primary truncate">{item.name}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        Cant: {item.quantity} · Subtotal: {formatRD(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-bg-base/30 flex justify-between items-center shrink-0">
          <div className="text-xs font-bold text-text-secondary">
            Total a dividir:{" "}
            <span className="font-mono text-text-primary font-extrabold">
              {formatRD(rightItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-bg-active text-text-secondary hover:text-text-primary transition-all text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading || rightItems.length === 0}
              onClick={handleConfirmSplit}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold transition-all text-xs shadow-button flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Confirmar División
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
