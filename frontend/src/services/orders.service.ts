import api from "./api";
import { db } from "./db";
import type { Order, OrderItem, OrderStatus, Table } from "@/lib/types";

// Native UUID v4 generator for browser
function generateUUID(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

export const ordersService = {
  list: async (params?: any) => {
    if (navigator.onLine) {
      try {
        const res = await api.get("/orders/", { params });
        // If we are getting the list of open orders, we can update cache
        if (params && params.status__in) {
          const data = res.data.results || res.data;
          for (const order of data) {
            await db.saveOrder(order);
          }
        }
        return res;
      } catch (err) {
        const cached = await db.getOrders();
        let filtered = cached;
        if (params?.table) {
          filtered = filtered.filter((o) => o.table === params.table);
        }
        if (params?.status) {
          filtered = filtered.filter((o) => o.status === params.status);
        }
        if (params?.status__in) {
          const statuses = params.status__in.split(",");
          filtered = filtered.filter((o) => statuses.includes(o.status));
        }
        return { data: { results: filtered, count: filtered.length } } as any;
      }
    } else {
      const cached = await db.getOrders();
      let filtered = cached;
      if (params?.table) {
        filtered = filtered.filter((o) => o.table === params.table);
      }
      if (params?.status) {
        filtered = filtered.filter((o) => o.status === params.status);
      }
      if (params?.status__in) {
        const statuses = params.status__in.split(",");
        filtered = filtered.filter((o) => statuses.includes(o.status));
      }
      return { data: { results: filtered, count: filtered.length } } as any;
    }
  },

  get: async (id: string) => {
    // If it's a local offline ID or we are offline
    if (id.startsWith("offline_") || !navigator.onLine) {
      const cached = await db.getOrder(id);
      if (cached) {
        return { data: cached } as any;
      }
      if (!navigator.onLine) {
        throw new Error("No hay conexión a internet y no se encontró la comanda local.");
      }
    }

    try {
      const res = await api.get(`/orders/${id}/`);
      await db.saveOrder(res.data);
      return res;
    } catch (err) {
      const cached = await db.getOrder(id);
      if (cached) {
        return { data: cached } as any;
      }
      throw err;
    }
  },

  create: async (data: any) => {
    if (navigator.onLine) {
      const res = await api.post("/orders/", data);
      await db.saveOrder(res.data);
      
      // Update local table to occupied
      const tables = await db.getTables();
      const table = tables.find((t) => t.id === data.table);
      if (table) {
        table.status = "occupied";
        table.active_order_id = res.data.id;
        await db.saveTable(table);
      }
      
      return res;
    } else {
      // Offline creation
      const offlineUuid = `offline_${generateUUID()}`;
      const tables = await db.getTables();
      const table = tables.find((t) => t.id === data.table);
      const tableNumber = table ? table.number : 0;

      // Calculate totals based on items
      const subtotal = data.items.reduce(
        (acc: number, item: any) => acc + parseFloat(item.unit_price) * item.quantity,
        0
      );
      // Dominican ITBIS (18%)
      const itbis = Math.round(subtotal * 0.18 * 100) / 100;
      const total = subtotal + itbis;

      const orderItems: OrderItem[] = data.items.map((item: any) => ({
        id: generateUUID(),
        order: offlineUuid,
        menu_item: item.menu_item,
        name: item.name,
        unit_price: parseFloat(item.unit_price),
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        notes: item.notes || "",
        status: "pending",
        prepared_at: null,
        total_price: parseFloat(item.unit_price) * item.quantity,
        created_at: new Date().toISOString(),
      }));

      const newOrder: Order = {
        id: offlineUuid,
        id_short: offlineUuid.slice(8, 16).toUpperCase(),
        table: data.table,
        table_number: tableNumber,
        waitress: data.waitress,
        waitress_name: "Mesera (Local)",
        status: "open",
        diners: data.diners || 1,
        subtotal: subtotal,
        itbis: itbis,
        tip: 0,
        total: total,
        payment_method: null,
        amount_received: null,
        change: null,
        receipt_number: null,
        offline_id: offlineUuid,
        synced: false,
        items: orderItems,
        created_at: new Date().toISOString(),
        closed_at: null,
      };

      await db.saveOrder(newOrder);

      // Update local table status
      if (table) {
        table.status = "occupied";
        table.active_order_id = offlineUuid;
        await db.saveTable(table);
      }

      // Add to Zustand sync queue via store helper
      // (This will be loaded reactively by the sync hook)

      return { data: newOrder } as any;
    }
  },

  submitToKitchen: async (id: string, itemIds: string[]) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      return api.post(`/orders/${id}/submit_to_kitchen/`, { item_ids: itemIds });
    } else {
      // Offline kitchen submit
      const order = await db.getOrder(id);
      if (order) {
        order.items = order.items.map((item) => {
          if (itemIds.includes(item.id)) {
            return { ...item, status: "preparing" };
          }
          return item;
        });
        await db.saveOrder(order);
        return { data: { detail: "Enviado a cocina localmente" } } as any;
      }
      throw new Error("Comanda no encontrada para enviar a cocina.");
    }
  },

  markReady: async (id: string, itemId: string) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      return api.post(`/orders/${id}/mark_ready/`, { item_id: itemId });
    } else {
      const order = await db.getOrder(id);
      if (order) {
        order.items = order.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, status: "ready", prepared_at: new Date().toISOString() };
          }
          return item;
        });
        await db.saveOrder(order);
        return { data: { detail: "Plato marcado listo localmente" } } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },

  updateItemStatus: async (id: string, itemId: string, status: "pending" | "preparing" | "ready" | "served") => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      return api.post(`/orders/${id}/update_item_status/`, { item_id: itemId, status });
    } else {
      const order = await db.getOrder(id);
      if (order) {
        order.items = order.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, status, prepared_at: status === "ready" ? new Date().toISOString() : item.prepared_at };
          }
          return item;
        });
        await db.saveOrder(order);
        return { data: { detail: `Estado actualizado a ${status} localmente` } } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },

  requestBill: async (id: string) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      const res = await api.post(`/orders/${id}/request_bill/`);
      const data = res.data;
      await db.saveOrder(data);
      
      // Update local table
      const tables = await db.getTables();
      const table = tables.find((t) => t.id === data.table);
      if (table) {
        table.status = "billing";
        await db.saveTable(table);
      }
      return res;
    } else {
      const order = await db.getOrder(id);
      if (order) {
        order.status = "billing";
        await db.saveOrder(order);
        
        // Update local table
        const tables = await db.getTables();
        const table = tables.find((t) => t.id === order.table);
        if (table) {
          table.status = "billing";
          await db.saveTable(table);
        }
        return { data: order } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },

  close: async (id: string, data: any) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      const res = await api.post(`/orders/${id}/close/`, data);
      await db.saveOrder(res.data);
      
      // Release table locally
      const tables = await db.getTables();
      const table = tables.find((t) => t.id === res.data.table);
      if (table) {
        table.status = "free";
        table.active_order_id = null;
        table.opened_at = null;
        table.assigned_to = null;
        await db.saveTable(table);
      }
      return res;
    } else {
      // Offline closure - Only cash is allowed
      const order = await db.getOrder(id);
      if (order) {
        const subtotal = data.subtotal || order.subtotal || 0;
        const itbis = data.itbis || order.itbis || 0;
        const tip = data.tip || 0;
        const total = data.total || (subtotal + itbis + tip);
        const amountReceived = data.amount_received || total;
        const change = amountReceived - total;

        const updatedOrder: Order = {
          ...order,
          status: "paid",
          subtotal,
          itbis,
          tip,
          total,
          payment_method: data.payment_method || "cash",
          amount_received: amountReceived,
          change: change > 0 ? change : 0,
          receipt_number: `R-PROV-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}-${generateUUID().slice(0, 4).toUpperCase()}`,
          rnc: data.rnc || "",
          whatsapp: data.whatsapp || "",
          closed_at: new Date().toISOString(),
          synced: false, // Must sync later
        };

        await db.saveOrder(updatedOrder);

        // Update table local status
        const tables = await db.getTables();
        const table = tables.find((t) => t.id === order.table);
        if (table) {
          table.status = "free";
          table.active_order_id = null;
          table.opened_at = null;
          table.assigned_to = null;
          await db.saveTable(table);
        }

        // Update local cash register session cash if active
        const activeRegister = await db.getActiveCashRegister();
        if (activeRegister && updatedOrder.payment_method === "cash") {
          activeRegister.current_cash = (activeRegister.current_cash || activeRegister.initial_amount) + parseFloat(updatedOrder.total!.toString());
          await db.saveCashRegister(activeRegister);
        }

        return { data: updatedOrder } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },

  // ------------------------------------------------------------------
  // B.1 — Agregar items a orden existente
  // ------------------------------------------------------------------
  addItems: async (orderId: string, items: any[]) => {
    if (navigator.onLine && !orderId.startsWith("offline_")) {
      const res = await api.post(`/orders/${orderId}/add_items/`, { items });
      await db.saveOrder(res.data);
      return res;
    } else {
      // Offline: agregar items localmente
      const order = await db.getOrder(orderId);
      if (order) {
        const newItems = items.map((item: any) => ({
          id: generateUUID(),
          order: orderId,
          menu_item: item.menu_item,
          name: item.name,
          unit_price: parseFloat(item.unit_price),
          quantity: item.quantity,
          modifiers: item.modifiers || [],
          notes: item.notes || "",
          status: "preparing" as const,
          prepared_at: null,
          total_price: parseFloat(item.unit_price) * item.quantity,
          created_at: new Date().toISOString(),
        }));
        order.items = [...(order.items || []), ...newItems];
        order.synced = false;
        await db.saveOrder(order);
        return { data: order } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },

  // ------------------------------------------------------------------
  // B.2 — Anular orden
  // ------------------------------------------------------------------
  voidOrder: async (orderId: string, reason: string) => {
    return api.post(`/orders/${orderId}/void/`, { reason });
  },

  // ------------------------------------------------------------------
  // B.3 — Aplicar descuento
  // ------------------------------------------------------------------
  applyDiscount: async (orderId: string, percentage: number, reason: string) => {
    return api.post(`/orders/${orderId}/apply_discount/`, { percentage, reason });
  },

  // ------------------------------------------------------------------
  // M1 — Dividir comanda
  // ------------------------------------------------------------------
  split: async (orderId: string, itemsToSplit: { item_id: string; quantity: number }[]) => {
    if (navigator.onLine && !orderId.startsWith("offline_")) {
      return api.post(`/orders/${orderId}/split/`, { items: itemsToSplit });
    } else {
      // Offline split
      const order = await db.getOrder(orderId);
      if (order) {
        const offlineUuid = `offline_${generateUUID()}`;
        const newOrderItems: any[] = [];

        for (const splitInfo of itemsToSplit) {
          const item = order.items.find((i) => i.id === splitInfo.item_id);
          if (item) {
            const qty = splitInfo.quantity;
            if (qty === item.quantity) {
              // Move item completely
              item.order = offlineUuid;
              newOrderItems.push(item);
              order.items = order.items.filter((i) => i.id !== splitInfo.item_id);
            } else {
              // Split item quantity
              item.quantity -= qty;
              item.total_price = item.unit_price * item.quantity;

              newOrderItems.push({
                id: generateUUID(),
                order: offlineUuid,
                menu_item: item.menu_item,
                name: item.name,
                unit_price: item.unit_price,
                quantity: qty,
                modifiers: item.modifiers || [],
                notes: item.notes || "",
                status: item.status,
                prepared_at: item.prepared_at,
                total_price: item.unit_price * qty,
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        // Create new offline order
        const subtotal = newOrderItems.reduce((s, i) => s + i.total_price, 0);
        const itbis = Math.round(subtotal * 0.18 * 100) / 100;
        const total = Math.round((subtotal + itbis) * 100) / 100;

        const newOrder: any = {
          id: offlineUuid,
          id_short: offlineUuid.slice(8, 16).toUpperCase(),
          table: order.table,
          table_number: order.table_number,
          waitress: order.waitress,
          status: "open",
          diners: 1,
          subtotal,
          itbis,
          tip: 0,
          total,
          payment_method: null,
          amount_received: null,
          change: null,
          receipt_number: null,
          offline_id: offlineUuid,
          synced: false,
          items: newOrderItems,
          created_at: new Date().toISOString(),
          closed_at: null,
        };

        // Recalculate original order totals
        const origSubtotal = order.items.reduce((s, i) => s + i.total_price, 0);
        const origItbis = Math.round(origSubtotal * 0.18 * 100) / 100;
        const origTotal = Math.round((origSubtotal + origItbis) * 100) / 100;

        order.subtotal = origSubtotal;
        order.itbis = origItbis;
        order.total = origTotal;
        order.synced = false;

        await db.saveOrder(order);
        await db.saveOrder(newOrder);

        return {
          data: {
            original_order: order,
            new_order: newOrder,
          },
        } as any;
      }
      throw new Error("Comanda no encontrada.");
    }
  },
};
export default ordersService;
