import { create } from "zustand";
import type { Order } from "@/lib/types";
import { db } from "@/services/db";

interface OfflineState {
  isOnline: boolean;
  pendingOrders: Order[];
  setIsOnline: (online: boolean) => void;
  setPendingOrders: (orders: Order[]) => void;
  loadPendingOrders: () => Promise<void>;
  addPendingOrder: (order: Order) => Promise<void>;
  removePendingOrder: (id: string) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  isOnline: navigator.onLine,
  pendingOrders: [],
  setIsOnline: (online) => set({ isOnline: online }),
  setPendingOrders: (orders) => set({ pendingOrders: orders }),
  loadPendingOrders: async () => {
    const orders = await db.getUnsyncedOrders();
    set({ pendingOrders: orders });
  },
  addPendingOrder: async (order) => {
    await db.saveOrder(order);
    set({ pendingOrders: [...get().pendingOrders, order] });
  },
  removePendingOrder: async (id) => {
    // Delete or mark as synced in IDB. Here we delete it from pending list
    await db.deleteOrder(id);
    set({ pendingOrders: get().pendingOrders.filter((o) => o.id !== id) });
  },
}));

