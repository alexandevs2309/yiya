import api from "./api";
import { db } from "./db";
import type { CashRegister } from "@/lib/types";

// Helper to generate UUID locally
function generateUUID(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

export const cashierService = {
  list: async (params?: any) => {
    if (navigator.onLine) {
      try {
        const res = await api.get<CashRegister[]>("/cashier/", { params });
        const data = (res.data as any).results || res.data;
        for (const reg of data) {
          await db.saveCashRegister(reg);
        }
        return res;
      } catch (err) {
        const cached = await db.getCashRegisters();
        return { data: cached } as any;
      }
    } else {
      const cached = await db.getCashRegisters();
      return { data: cached } as any;
    }
  },
  
  get: async (id: string) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      try {
        const res = await api.get<CashRegister>(`/cashier/${id}/`);
        await db.saveCashRegister(res.data);
        return res;
      } catch (err) {
        const cached = await db.getCashRegisters();
        const found = cached.find((r) => r.id === id);
        if (found) return { data: found } as any;
        throw err;
      }
    } else {
      const cached = await db.getCashRegisters();
      const found = cached.find((r) => r.id === id);
      if (found) return { data: found } as any;
      throw new Error("No hay conexión a internet para recuperar esta sesión de caja.");
    }
  },
  
  getActive: async (): Promise<CashRegister | null> => {
    if (navigator.onLine) {
      try {
        const res = await api.get<CashRegister[]>("/cashier/", {
          params: { status: "open", limit: 1 },
        });
        const results = (res.data as any).results || res.data;
        if (results && results.length > 0) {
          const activeReg = results[0];
          // Clear older local open registers, save the fresh one
          await db.clearCashRegisters();
          await db.saveCashRegister(activeReg);
          return activeReg;
        }
        return null;
      } catch {
        return db.getActiveCashRegister();
      }
    } else {
      return db.getActiveCashRegister();
    }
  },
  
  open: async (initialAmount: number, userId: string) => {
    if (navigator.onLine) {
      const res = await api.post<CashRegister>("/cashier/", {
        initial_amount: initialAmount,
      });
      await db.saveCashRegister(res.data);
      return res;
    } else {
      // Local offline session
      const offlineUuid = `offline_${generateUUID()}`;
      const newRegister: CashRegister = {
        id: offlineUuid,
        opened_at: new Date().toISOString(),
        closed_at: null,
        opened_by: userId,
        opened_by_name: "Administrador (Local)",
        closed_by: null,
        closed_by_name: null,
        initial_amount: initialAmount,
        expected_cash: initialAmount,
        actual_cash: null,
        difference: null,
        current_cash: initialAmount,
        status: "open",
        notes: "",
      };
      
      await db.saveCashRegister(newRegister);
      return { data: newRegister } as any;
    }
  },
    
  close: async (id: string, actualCash: number, notes?: string) => {
    if (navigator.onLine && !id.startsWith("offline_")) {
      const res = await api.post<CashRegister>(`/cashier/${id}/close/`, {
        actual_cash: actualCash,
        notes,
      });
      // Update local db
      await db.saveCashRegister(res.data);
      return res;
    } else {
      // Offline closing
      const cached = await db.getCashRegisters();
      const register = cached.find((r) => r.id === id);
      if (register) {
        // Compute difference
        const expected = register.current_cash || register.initial_amount;
        const diff = actualCash - expected;
        
        const closedRegister: CashRegister = {
          ...register,
          closed_at: new Date().toISOString(),
          closed_by_name: "Administrador (Local)",
          expected_cash: expected,
          actual_cash: actualCash,
          difference: diff,
          status: "closed",
          notes: notes || "",
        };
        
        await db.saveCashRegister(closedRegister);
        return { data: closedRegister } as any;
      }
      throw new Error("No se encontró la sesión de caja local para cerrar.");
    }
  },
};
export default cashierService;

