import { create } from "zustand";
import type { Table } from "@/lib/types";

interface TablesState {
  tables: Table[];
  setTables: (tables: Table[]) => void;
  updateTable: (id: string, patch: Partial<Table>) => void;
}

export const useTablesStore = create<TablesState>()((set, get) => ({
  tables: [],
  setTables: (tables) => set({ tables }),
  updateTable: (id, patch) =>
    set({
      tables: get().tables.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }),
}));
