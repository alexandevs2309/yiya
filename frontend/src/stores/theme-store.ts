import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  solMode: boolean
  setTheme: (t: Theme) => void
  setSolMode: (enabled: boolean) => void
  toggleTheme: () => void
  toggleSolMode: () => void
}

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      solMode: false,
      setTheme: (theme) => set({ theme }),
      setSolMode: (solMode) => set({ solMode }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleSolMode: () => set((s) => ({ solMode: !s.solMode })),
    }),
    { name: 'dyiya-theme' },
  ),
)

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
}

export function applySolMode(enabled: boolean) {
  document.documentElement.classList.toggle('modo-sol', enabled)
}

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('dyiya-theme')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.theme) {
        applyTheme(parsed.state.theme)
      }
      if (parsed?.state?.solMode) {
        applySolMode(parsed.state.solMode)
      }
    } catch {}
  } else {
    applyTheme(getSystemTheme())
  }
}
