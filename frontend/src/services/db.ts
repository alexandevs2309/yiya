import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Category, MenuItem, Table, Order, CashRegister } from "@/lib/types";

interface POSDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
  };
  menu_items: {
    key: string;
    value: MenuItem;
  };
  tables: {
    key: string;
    value: Table;
  };
  orders: {
    key: string;
    value: Order;
  };
  cash_registers: {
    key: string;
    value: CashRegister;
  };
}

const DB_NAME = "diyiya-pos-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("categories", { keyPath: "id" });
        db.createObjectStore("menu_items", { keyPath: "id" });
        db.createObjectStore("tables", { keyPath: "id" });
        db.createObjectStore("orders", { keyPath: "id" });
        db.createObjectStore("cash_registers", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export const db = {
  // Categories
  async getCategories(): Promise<Category[]> {
    const d = await getDB();
    return d.getAll("categories");
  },
  async saveCategories(categories: Category[]): Promise<void> {
    const d = await getDB();
    const tx = d.transaction("categories", "readwrite");
    await tx.store.clear();
    for (const cat of categories) {
      await tx.store.put(cat);
    }
    await tx.done;
  },

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const d = await getDB();
    return d.getAll("menu_items");
  },
  async saveMenuItems(items: MenuItem[]): Promise<void> {
    const d = await getDB();
    const tx = d.transaction("menu_items", "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  },

  // Tables
  async getTables(): Promise<Table[]> {
    const d = await getDB();
    return d.getAll("tables");
  },
  async saveTables(tables: Table[]): Promise<void> {
    const d = await getDB();
    const tx = d.transaction("tables", "readwrite");
    await tx.store.clear();
    for (const table of tables) {
      await tx.store.put(table);
    }
    await tx.done;
  },
  async saveTable(table: Table): Promise<void> {
    const d = await getDB();
    await d.put("tables", table);
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const d = await getDB();
    return d.getAll("orders");
  },
  async getOrder(id: string): Promise<Order | undefined> {
    const d = await getDB();
    return d.get("orders", id);
  },
  async saveOrder(order: Order): Promise<void> {
    const d = await getDB();
    await d.put("orders", order);
  },
  async deleteOrder(id: string): Promise<void> {
    const d = await getDB();
    await d.delete("orders", id);
  },
  async getUnsyncedOrders(): Promise<Order[]> {
    const orders = await this.getOrders();
    return orders.filter((o) => !o.synced);
  },

  // Cash Registers
  async getCashRegisters(): Promise<CashRegister[]> {
    const d = await getDB();
    return d.getAll("cash_registers");
  },
  async saveCashRegister(register: CashRegister): Promise<void> {
    const d = await getDB();
    await d.put("cash_registers", register);
  },
  async getActiveCashRegister(): Promise<CashRegister | null> {
    const registers = await this.getCashRegisters();
    return registers.find((r) => r.status === "open") || null;
  },
  async clearCashRegisters(): Promise<void> {
    const d = await getDB();
    await d.clear("cash_registers");
  },
};
