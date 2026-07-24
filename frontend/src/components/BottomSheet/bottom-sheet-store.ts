import { create } from 'zustand'

export type SnapPoint = 'collapsed' | 'half' | 'expanded'

export interface BottomSheetState {
  isOpen: boolean
  snap: SnapPoint

  open: () => void
  close: () => void
  setSnap: (snap: SnapPoint) => void
}

export const useBottomSheetStore = create<BottomSheetState>((set) => ({
  isOpen: false,
  snap: 'collapsed',

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, snap: 'collapsed' }),
  setSnap: (snap) => set({ snap }),
}))
