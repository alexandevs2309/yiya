import { usePreferencesStore, TTS_VOICES } from '@/stores/preferences-store'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

let currentAudio: HTMLAudioElement | null = null

let bgCtx: AudioContext | null = null
let bgGain: GainNode | null = null

export function initBackgroundAudio() {
  if (bgCtx) return
  try {
    bgCtx = new AudioContext()
    bgGain = bgCtx.createGain()
    bgGain.gain.value = 0.001
    bgGain.connect(bgCtx.destination)

    const osc = bgCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 20
    osc.connect(bgGain)
    osc.start()

    if (bgCtx.state === 'suspended') bgCtx.resume()
  } catch {}
}

function ensureBgAudio() {
  if (bgCtx?.state === 'suspended') bgCtx.resume()
}

function createChimeWav(type: 'normal' | 'urgent'): string {
  const sampleRate = 44100
  const channels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8

  function addTone(data: number[], freq: number, duration: number, volume: number) {
    const samples = Math.floor(sampleRate * duration)
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate
      const envelope = Math.max(0, 1 - t / duration)
      data.push(Math.round(volume * envelope * Math.sin(2 * Math.PI * freq * t) * 32767))
    }
  }

  function addSilence(data: number[], duration: number) {
    const samples = Math.floor(sampleRate * duration)
    for (let i = 0; i < samples; i++) data.push(0)
  }

  let samples: number[] = []
  if (type === 'urgent') {
    addTone(samples, 880, 0.12, 0.5)
    addSilence(samples, 0.03)
    addTone(samples, 880, 0.12, 0.5)
    addSilence(samples, 0.03)
    addTone(samples, 880, 0.12, 0.5)
    addSilence(samples, 0.07)
    addTone(samples, 660, 0.3, 0.45)
    addSilence(samples, 0.05)
    addTone(samples, 660, 0.3, 0.45)
    addSilence(samples, 0.05)
    addTone(samples, 660, 0.5, 0.4)
  } else {
    addTone(samples, 523.25, 0.2, 0.4)
    addSilence(samples, 0.04)
    addTone(samples, 659.25, 0.2, 0.4)
    addSilence(samples, 0.04)
    addTone(samples, 783.99, 0.3, 0.35)
  }

  const numSamples = samples.length
  const dataSize = numSamples * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * bytesPerSample, samples[i], true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(binary)
}

function createCallWaiterWav(): string {
  const sampleRate = 22050
  const channels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8

  function addTone(data: number[], freq: number, duration: number, volume: number) {
    const samples = Math.floor(sampleRate * duration)
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate
      const envelope = Math.max(0, 1 - t / duration)
      data.push(Math.round(volume * envelope * Math.sin(2 * Math.PI * freq * t) * 32767))
    }
  }

  function addSilence(data: number[], duration: number) {
    const samples = Math.floor(sampleRate * duration)
    for (let i = 0; i < samples; i++) data.push(0)
  }

  let samples: number[] = []
  addTone(samples, 660, 0.12, 0.5)
  addSilence(samples, 0.08)
  addTone(samples, 880, 0.12, 0.5)
  addSilence(samples, 0.08)
  addTone(samples, 1046.5, 0.25, 0.5)

  const numSamples = samples.length
  const dataSize = numSamples * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * bytesPerSample, samples[i], true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(binary)
}

let normalChimeData: string | null = null
let urgentChimeData: string | null = null
let callWaiterData: string | null = null

function getChimeData(type: 'normal' | 'urgent'): string {
  if (type === 'urgent') {
    if (!urgentChimeData) urgentChimeData = createChimeWav('urgent')
    return urgentChimeData
  }
  if (!normalChimeData) normalChimeData = createChimeWav('normal')
  return normalChimeData
}

function getCallWaiterData(): string {
  if (!callWaiterData) callWaiterData = createCallWaiterWav()
  return callWaiterData
}

function safePlay(audio: HTMLAudioElement) {
  audio.play().catch(() => {})
}

export function playKitchenChime(type: 'normal' | 'urgent' = 'normal') {
  ensureBgAudio()
  try {
    const audio = new Audio(getChimeData(type))
    audio.volume = 0.6
    safePlay(audio)
  } catch {}
}

export function playCallWaiterSound() {
  ensureBgAudio()
  try {
    const audio = new Audio(getCallWaiterData())
    audio.volume = 0.7
    safePlay(audio)
  } catch {}
}

export function speakText(text: string, voice?: string) {
  ensureBgAudio()
  const token = localStorage.getItem('access_token')
  if (!token) return

  const voiceId = voice || usePreferencesStore.getState().ttsVoice || 'es-mx'
  const voiceParam = `&voice=${encodeURIComponent(voiceId)}`

  currentAudio?.pause()
  currentAudio = null

  fetch(`${API_BASE}/auth/tts/?text=${encodeURIComponent(text)}${voiceParam}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => {
      if (!res.ok) throw new Error('TTS failed')
      return res.blob()
    })
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = 1.0
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (currentAudio === audio) currentAudio = null
      }
      safePlay(audio)
      currentAudio = audio
    })
    .catch(() => {})
}
