import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MenuPanel } from "./MenuPanel";
import { CartPanel } from "./CartPanel";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { ordersService } from "@/services/orders.service";
import { useToast } from "@/components/ui/toast";

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { items, setTableId, activeOrderId, setActiveOrderId } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const { addToast } = useToast();
  const [diners, setDiners] = useState(1);
  const [sending, setSending] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

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
      if (orders.length > 0) {
        // Prefer open orders; fallback to billing
        const openOrder = orders.find((o) => o.status === "open") || orders[0];
        setActiveOrderId(openOrder.id);
        setDiners(openOrder.diners || 1);
      }
    } catch {
    } finally {
      setLoadingOrder(false);
    }
  };

  const sendOrder = useCallback(async () => {
    if (!tableId || items.length === 0 || !user) return;
    setSending(true);
    try {
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
      // Clear the cart items (keep tableId for potential additional orders)
      useCartStore.getState().clear();
      // Restore tableId since clear() resets it
      setTableId(tableId);
      addToast({ title: "Orden enviada", description: "Mesa enviada a cocina", variant: "success" });
      navigate("/tables");
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(" | ")
        : "No se pudo enviar la orden";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [tableId, items, user, diners, navigate, addToast, setActiveOrderId, setTableId]);

  const requestBill = useCallback(async () => {
    if (!tableId || !user) return;
    setSending(true);
    try {
      let orderId = activeOrderId;
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
  }, [tableId, items, user, diners, activeOrderId, navigate, addToast]);

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
          sending={sending}
          hasActiveOrder={!!activeOrderId}
        />
      </div>
    </div>
  );
}
