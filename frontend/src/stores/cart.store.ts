import { create } from "zustand";
import type { CartItem } from "@/lib/types";

interface CartState {
  tableId: string | null;
  items: CartItem[];
  activeOrderId: string | null;
  setTableId: (id: string | null) => void;
  setActiveOrderId: (id: string | null) => void;
  addItem: (item: CartItem) => void;
  updateItem: (index: number, patch: Partial<CartItem>) => void;
  removeItem: (index: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
  tableId: null,
  items: [],
  activeOrderId: null,
  setTableId: (id) => set({ tableId: id, items: [], activeOrderId: null }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  addItem: (item) =>
    set((state) => {
      const idx = state.items.findIndex(
        (i) =>
          i.menuItemId === item.menuItemId &&
          JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers),
      );
      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        return { items: next };
      }
      return { items: [...state.items, item] };
    }),
  updateItem: (index, patch) =>
    set((state) => ({
      items: state.items.map((i, idx) =>
        idx === index ? { ...i, ...patch } : i,
      ),
    })),
  removeItem: (index) =>
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    })),
  clear: () => set({ items: [], tableId: null, activeOrderId: null }),
}));