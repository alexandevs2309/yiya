import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BusinessSettings {
  businessName: string;
  rnc: string;
  address: string;
  phone: string;
  currency: string;
  itbisRate: number;
  propinaRate: number;
  cardCommission: number;
  receiptFooter: string;
  defaultNcfType: "01" | "02" | "04";
}

interface SettingsStore {
  settings: BusinessSettings;
  updateSettings: (partial: Partial<BusinessSettings>) => void;
}

const defaultSettings: BusinessSettings = {
  businessName: "D' Yiya Samaná",
  rnc: "1-31-45678-9",
  address: "Av. La Marina, Samaná, RD",
  phone: "809-538-2345",
  currency: "RD$",
  itbisRate: 18,
  propinaRate: 10,
  cardCommission: 2.5,
  receiptFooter: "¡Gracias por su visita!",
  defaultNcfType: "02",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
    }),
    { name: "diyiya-settings" },
  ),
);
