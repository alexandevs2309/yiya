import { useEffect, useRef } from "react";
import { useOfflineStore } from "@/stores/offline.store";
import { db } from "@/services/db";
import api from "@/services/api";
import { useToast } from "@/components/ui/toast";
import { useTablesStore } from "@/stores/tables.store";
import { tablesService } from "@/services/tables.service";

export function useOfflineSync() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const loadPendingOrders = useOfflineStore((s) => s.loadPendingOrders);
  const { addToast } = useToast();
  const setTables = useTablesStore((s) => s.setTables);
  const syncingRef = useRef(false);

  useEffect(() => {
    // Load pending orders from IndexedDB on startup
    loadPendingOrders();
  }, [loadPendingOrders]);

  useEffect(() => {
    if (isOnline && !syncingRef.current) {
      syncOfflineData();
    }
  }, [isOnline]);

  const syncOfflineData = async () => {
    syncingRef.current = true;
    try {
      const allUnsynced = await db.getUnsyncedOrders();
      // Filter out orders that have failed too many times
      const unsynced = allUnsynced.filter(o => (o.sync_attempts || 0) < 3);

      if (unsynced.length === 0) {
        return;
      }

      addToast({
        title: "Sincronización",
        description: `Sincronizando ${unsynced.length} comanda(s) pendiente(s)...`,
        variant: "default",
      });

      let successCount = 0;

      for (const order of unsynced) {
        try {
          if (order.id.startsWith("offline_")) {
            // 1. Create order on backend
            const orderData = {
              table: order.table,
              waitress: order.waitress,
              diners: order.diners,
              offline_id: order.offline_id, // Pass offline UUID
              items: order.items.map((item) => ({
                menu_item: item.menu_item,
                name: item.name,
                unit_price: item.unit_price,
                quantity: item.quantity,
                modifiers: item.modifiers,
                notes: item.notes,
              })),
            };

            const createRes = await api.post("/orders/", orderData);
            const serverOrderId = createRes.data.id;

            // 2. Submit to kitchen if it was sent
            // Find all item IDs from the server response to submit
            const serverItemIds = createRes.data.items.map((i: any) => i.id);
            await api.post(`/orders/${serverOrderId}/submit_to_kitchen/`, {
              item_ids: serverItemIds,
            });

            // 3. Request bill if it was billing
            if (order.status === "billing" || order.status === "paid") {
              await api.post(`/orders/${serverOrderId}/request_bill/`);
            }

            // 4. Close/pay order if it was paid offline
            if (order.status === "paid") {
              await api.post(`/orders/${serverOrderId}/close/`, {
                payment_method: order.payment_method,
                subtotal: order.subtotal,
                itbis: order.itbis,
                total: order.total,
                tip: order.tip || 0,
                amount_received: order.amount_received,
                rnc: order.rnc,
                whatsapp: order.whatsapp,
              });
            }

            // Successfully synced! Delete offline order from IndexedDB
            await db.deleteOrder(order.id);
            successCount++;
          } else {
            // Real server order ID but was closed/paid offline
            if (order.status === "paid") {
              await api.post(`/orders/${order.id}/close/`, {
                payment_method: order.payment_method,
                subtotal: order.subtotal,
                itbis: order.itbis,
                total: order.total,
                tip: order.tip || 0,
                amount_received: order.amount_received,
                rnc: order.rnc,
                whatsapp: order.whatsapp,
              });
            }
            
            // Successfully synced! Delete or mark synced in IndexedDB
            await db.deleteOrder(order.id);
            successCount++;
          }
        } catch (err) {
          console.error("Error syncing order:", order.id, err);
          // Update sync attempts to avoid infinite loops for malformed requests
          const updatedOrder = { ...order, sync_attempts: (order.sync_attempts || 0) + 1 };
          if (updatedOrder.sync_attempts >= 3) {
            console.warn(`Order ${order.id} failed to sync 3 times. Stopping automatic sync.`);
            addToast({
              title: "Error de Sincronización",
              description: `La comanda de la mesa ${order.table_number} no se pudo sincronizar tras varios intentos.`,
              variant: "error",
            });
            // We could optionally mark it as "sync_failed" or just leave it for manual retry
          }
          await db.saveOrder(updatedOrder);
        }
      }

      if (successCount > 0) {
        addToast({
          title: "Sincronización exitosa",
          description: `Se sincronizaron ${successCount} comandas con el servidor.`,
          variant: "success",
        });

        // Reload tables status from backend
        try {
          const res = await tablesService.list();
          setTables(res.data.results || res.data);
        } catch {
          // Ignore table list error during sync
        }
      }
      
      // Update store pending orders count
      await loadPendingOrders();
    } catch (err) {
      console.error("Offline sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  };
}
