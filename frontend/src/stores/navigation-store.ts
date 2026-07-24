import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleId =
  | 'login'
  | 'floor-plan'
  | 'pos'
  | 'kds'
  | 'cashier'
  | 'dashboard'
  | 'invoicing'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'cash-register'
  | 'settings'

interface NavigationStore {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      activeModule: 'floor-plan',
      setActiveModule: (module) => set({ activeModule: module }),
    }),
    { name: 'dyiya-nav' },
  ),
)
