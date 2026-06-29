import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MenuPanel } from "./MenuPanel";
import { CartPanel } from "./CartPanel";
import { useCartStore } from "@/stores/cart.store";
import { useTablesStore } from "@/stores/tables.store";
import { useAuthStore } from "@/stores/auth.store";
import { ordersService } from "@/services/orders.service";
import { useToast } from "@/components/ui/toast";
import { SplitModal } from "./SplitModal";
import { formatRD } from "@/lib/utils";
import { printOrderTicket } from "@/lib/printHelper";

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { items, setTableId, activeOrderId, setActiveOrderId } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const { addToast } = useToast();
  const [diners, setDiners] = useState(1);
  const [sending, setSending] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showOrderSelectionModal, setShowOrderSelectionModal] = useState(false);
  const [tableOrders, setTableOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!tableId) return;
    setTableId(tableId);
    loadExistingOrder(tableId);
  }, [tableId]);

  const loadExistingOrder = async (tid: string) => {
    setLoadingOrder(true);
    try {
      // Look for open or billing orders on this table
      const res = await ordersService.list({ table: tid, status__in: "open,billing" });
      const orders: any[] = res.data.results || res.data;
      if (orders.length > 1) {
        setTableOrders(orders);
        setShowOrderSelectionModal(true);
        // Do not pre-select an active order yet, waitress must choose
        setActiveOrderId(null);
        setActiveOrder(null);
      } else if (orders.length === 1) {
        const singleOrder = orders[0];
        setActiveOrderId(singleOrder.id);
        setActiveOrder(singleOrder);
        setDiners(singleOrder.diners || 1);
      } else {
        setActiveOrderId(null);
        setActiveOrder(null);
        setDiners(1);
      }
    } catch {
      setActiveOrderId(null);
      setActiveOrder(null);
      setDiners(1);
    } finally {
      setLoadingOrder(false);
    }
  };

  const sendOrder = useCallback(async () => {
    if (!tableId || items.length === 0 || !user) return;
    setSending(true);
    try {
      if (activeOrderId) {
        // B.6 — Agregar items a orden existente (auto-envía a cocina)
        const res = await ordersService.addItems(
          activeOrderId,
          items.map((i) => ({
            menu_item: i.menuItemId,
            name: i.name,
            unit_price: i.unitPrice,
            quantity: i.quantity,
            modifiers: i.modifiers,
            notes: i.notes,
          })),
        );
        setActiveOrder(res.data);
        useCartStore.getState().clear();
        setTableId(tableId);
        const table = useTablesStore.getState().tables.find((t) => t.id === tableId);
        printOrderTicket({
          tableNumber: table?.number ?? tableId ?? "",
          items: items.map((i) => ({ qty: i.quantity, name: i.name, notes: i.notes, modifiers: Array.isArray(i.modifiers) ? i.modifiers.join(", ") : i.modifiers })),
          waitressName: user?.first_name || user?.username,
          type: "kitchen",
        });
        addToast({ title: "Items agregados", description: "Nuevos platos enviados a cocina", variant: "success" });
        navigate("/tables");
      } else {
        // Crear orden nueva (flujo original)
        const orderData = {
          table: tableId,
          waitress: user.id,
          diners,
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
        setActiveOrderId(res.data.id);
        setActiveOrder(res.data);
        useCartStore.getState().clear();
        setTableId(tableId);
        printOrderTicket({
          tableNumber: tableId ?? "",
          items: items.map((i) => ({ qty: i.quantity, name: i.name, notes: i.notes, modifiers: Array.isArray(i.modifiers) ? i.modifiers.join(", ") : i.modifiers })),
          waitressName: user?.first_name || user?.username,
          type: "kitchen",
        });
        addToast({ title: "Orden enviada", description: "Mesa enviada a cocina", variant: "success" });
        navigate("/tables");
      }
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
        : "No se pudo enviar la orden";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [tableId, items, user, diners, activeOrderId, navigate, addToast, setActiveOrderId, setTableId]);

  const requestBill = useCallback(async () => {
    if (!tableId || !user) return;
    setSending(true);
    try {
      let orderId = activeOrderId;

      // Si hay items nuevos en el carrito, agregarlos primero
      if (items.length > 0 && orderId) {
        await ordersService.addItems(
          orderId,
          items.map((i) => ({
            menu_item: i.menuItemId,
            name: i.name,
            unit_price: i.unitPrice,
            quantity: i.quantity,
            modifiers: i.modifiers,
            notes: i.notes,
          })),
        );
        useCartStore.getState().clear();
        setTableId(tableId);
      }

      if (orderId) {
        await ordersService.requestBill(orderId);
        addToast({ title: "Cuenta solicitada", description: "Mesa en espera de pago", variant: "success" });
      } else if (items.length > 0) {
        const orderData = {
          table: tableId,
          waitress: user.id,
          diners,
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
        orderId = res.data.id;
        await ordersService.requestBill(orderId!);
        useCartStore.getState().clear();
        setTableId(tableId);
        addToast({ title: "Cuenta solicitada", description: "Mesa en espera de pago", variant: "success" });
      } else {
        addToast({ title: "Sin productos", description: "Agrega productos antes de pedir la cuenta", variant: "error" });
        setSending(false);
        return;
      }
      // Navigate directly to checkout so the cashier can process immediately
      navigate(`/checkout/${orderId}`);
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
        : "No se pudo solicitar la cuenta";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [tableId, items, user, diners, activeOrderId, navigate, addToast, setTableId]);

  // B.2 — Anular orden
  const handleVoidOrder = useCallback(async (reason: string) => {
    if (!activeOrderId) return;
    setSending(true);
    try {
      await ordersService.voidOrder(activeOrderId, reason);
      addToast({ title: "Orden anulada", description: "La orden fue anulada correctamente", variant: "success" });
      useCartStore.getState().clear();
      navigate("/tables");
    } catch (err: any) {
      const msg = err.response?.data?.error || "No se pudo anular la orden";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [activeOrderId, navigate, addToast]);

  // B.3 — Aplicar descuento
  const handleApplyDiscount = useCallback(async (percentage: number, reason: string) => {
    if (!activeOrderId) return;
    setSending(true);
    try {
      const res = await ordersService.applyDiscount(activeOrderId, percentage, reason);
      setActiveOrder(res.data);
      addToast({ title: "Descuento aplicado", description: `${percentage}% de descuento`, variant: "success" });
    } catch (err: any) {
      const msg = err.response?.data?.error || "No se pudo aplicar el descuento";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [activeOrderId, addToast]);

  if (loadingOrder) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-tertiary">Cargando orden...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden md:max-w-[calc(100%-22rem)]">
        <MenuPanel />
      </div>
      <div className="w-full md:w-[22rem] shrink-0">
        <CartPanel
          diners={diners}
          onDinersChange={setDiners}
          onSendToKitchen={sendOrder}
          onRequestBill={requestBill}
          onVoidOrder={handleVoidOrder}
          onApplyDiscount={handleApplyDiscount}
          onSplitOrder={() => setShowSplitModal(true)}
          sending={sending}
          hasActiveOrder={!!activeOrderId}
          activeOrder={activeOrder}
          permissions={permissions}
        />
      </div>

      {/* Split check modal */}
      {showSplitModal && activeOrder && (
        <SplitModal
          order={activeOrder}
          onClose={() => setShowSplitModal(false)}
          onSuccess={() => {
            setShowSplitModal(false);
            if (tableId) loadExistingOrder(tableId);
          }}
        />
      )}

      {/* Multiple active bills selection modal */}
      {showOrderSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col p-6 space-y-4 animate-scale-up">
            <div className="text-center">
              <h3 className="text-sm font-bold text-text-primary">Múltiples cuentas abiertas</h3>
              <p className="text-[10px] text-text-secondary mt-1">
                Esta mesa tiene más de una comanda activa. Selecciona una para continuar o crea una nueva cuenta:
              </p>
            </div>
            
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
              {tableOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setActiveOrderId(o.id);
                    setActiveOrder(o);
                    setDiners(o.diners || 1);
                    setShowOrderSelectionModal(false);
                  }}
                  className="w-full p-4 rounded-xl border border-border hover:border-border-strong bg-bg-elevated/5 hover:bg-bg-elevated/15 transition-all text-left flex justify-between items-center group"
                >
                  <div>
                    <p className="text-xs font-bold text-text-primary">Cuenta #{o.id_short}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Mesera: {o.waitress_name || "—"} · {o.diners} comensales
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-extrabold text-sky-400">{formatRD(o.total || 0)}</p>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary bg-bg-active px-1.5 py-0.5 rounded-full mt-1 inline-block">
                      {o.status === "billing" ? "En cobro" : "Abierta"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveOrderId(null);
                  setActiveOrder(null);
                  setDiners(1);
                  setShowOrderSelectionModal(false);
                  useCartStore.getState().clear();
                }}
                className="h-10 w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white transition-all shadow-button active:scale-[0.98]"
              >
                + Abrir Nueva Cuenta
              </button>
              <button
                onClick={() => navigate("/tables")}
                className="h-10 w-full rounded-xl border border-border hover:bg-bg-active text-xs font-bold text-text-secondary transition-all"
              >
                Volver a Mesas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
