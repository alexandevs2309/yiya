import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const TTS_VOICES = [
  { id: 'es-mx', label: 'Español México (Dalia)', value: 'es-MX-DaliaNeural' },
  { id: 'es-es', label: 'Español España (Elvira)', value: 'es-ES-ElviraNeural' },
  { id: 'es-us', label: 'Español US (Elena)', value: 'es-US-ElenaNeural' },
  { id: 'es-co', label: 'Español Colombia (Salomé)', value: 'es-CO-SalomeNeural' },
  { id: 'es-ar', label: 'Español Argentina (Elena)', value: 'es-AR-ElenaNeural' },
] as const

export type TTSVoiceId = (typeof TTS_VOICES)[number]['id']

export type NavigationMode = 'sidebar' | 'bottom'

interface PreferencesState {
  soundEnabled: boolean
  language: string
  ttsVoice: TTSVoiceId
  navigationMode: NavigationMode
  setSoundEnabled: (val: boolean) => void
  setLanguage: (val: string) => void
  setTTSVoice: (val: TTSVoiceId) => void
  setNavigationMode: (val: NavigationMode) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      language: 'es',
      ttsVoice: 'es-mx',
      navigationMode: 'sidebar',
      setSoundEnabled: (val) => set({ soundEnabled: val }),
      setLanguage: (val) => set({ language: val }),
      setTTSVoice: (val) => set({ ttsVoice: val }),
      setNavigationMode: (val) => set({ navigationMode: val }),
    }),
    {
      name: 'dyiya-preferences',
    }
  )
)
