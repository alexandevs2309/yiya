import { create } from "zustand";
import type { Order } from "@/lib/types";

interface KitchenState {
  orders: Order[];
  alertTableNumbers: number[];
  setOrders: (orders: Order[]) => void;
  updateItemStatus: (itemId: string, status: string) => void;
  setAlertTableNumbers: (tables: number[]) => void;
  clearAlerts: () => void;
}

export const useKitchenStore = create<KitchenState>()((set, get) => ({
  orders: [],
  alertTableNumbers: [],
  setOrders: (orders) => set({ orders }),
  updateItemStatus: (itemId, status) =>
    set({
      orders: get().orders.map((o) => ({
        ...o,
        items: o.items.map((i) =>
          i.id === itemId ? { ...i, status: status as any } : i,
        ),
      })),
    }),
  setAlertTableNumbers: (tables) => set({ alertTableNumbers: tables }),
  clearAlerts: () => set({ alertTableNumbers: [] }),
}));
