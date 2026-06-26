import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  activeCategory: string | null;
  searchQuery: string;
  activeTableView: "grid" | "list";
  sunMode: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCategory: (cat: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTableView: (view: "grid" | "list") => void;
  setSunMode: (active: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeCategory: null,
      searchQuery: "",
      activeTableView: "grid",
      sunMode: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCategory: (cat) => set({ activeCategory: cat }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveTableView: (view) => set({ activeTableView: view }),
      setSunMode: (active) => {
        set({ sunMode: active });
        if (active) {
          document.documentElement.classList.add("sun-mode");
        } else {
          document.documentElement.classList.remove("sun-mode");
        }
      },
    }),
    {
      name: "dyiya-ui-storage",
      partialize: (state) => ({ sunMode: state.sunMode, sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        if (state?.sunMode) {
          document.documentElement.classList.add("sun-mode");
        }
      },
    }
  )
);
