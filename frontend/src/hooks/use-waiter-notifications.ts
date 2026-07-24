import { useEffect, useRef } from 'react'
import { playCallWaiterSound, speakText } from '@/lib/sound'
import { useAppStore } from '@/stores/app-store'
import { usePreferencesStore } from '@/stores/preferences-store'
import { useNotificationsStore } from '@/stores/notifications-store'
import type { UserRole } from '@/types'

type EventType = 'call_waiter' | 'order_ready' | 'new_order' | 'item_ready'

const EVENT_ROLES: Record<EventType, UserRole[]> = {
  call_waiter: ['admin', 'cashier', 'waiter'],
  order_ready: ['admin', 'cashier', 'waiter', 'cook'],
  new_order: ['admin'],
  item_ready: ['admin', 'cashier', 'waiter', 'cook'],
}

const PHRASES: Record<EventType, string[]> = {
  call_waiter: [
    'Mesa {table} necesita mesero',
    'Mesa {table} solicita asistencia',
    'Atención, mesa {table} requiere servicio',
    'Mesa {table} está llamando',
    'Por favor, atender mesa {table}',
  ],
  order_ready: [
    'Mesa {table}, su pedido está listo',
    'Orden lista para mesa {table}',
    'Mesa {table}, pueden recoger su pedido',
    'Pedido completado para mesa {table}',
    'Mesa {table}, servicio listo',
  ],
  new_order: [
    'Nueva orden para mesa {table}',
    'Orden recibida para mesa {table}',
  ],
  item_ready: [
    '{item} listo para mesa {table}',
    '{item} completado, mesa {table}',
    'Mesa {table}, {item} está listo',
    'Un {item} para mesa {table}',
    '{quantity} {item} listo para mesa {table}',
  ],
}

const NOTIFICATION_TITLES: Record<EventType, string> = {
  call_waiter: 'Cliente necesita mesero',
  order_ready: 'Pedido listo',
  new_order: 'Nueva orden',
  item_ready: 'Plato listo',
}

const NOTIFICATION_ICONS: Record<EventType, string> = {
  call_waiter: 'warning',
  order_ready: 'success',
  new_order: 'info',
  item_ready: 'success',
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function handleEvent(type: EventType, table: string, ttsVoice: string, extra?: Record<string, any>) {
  const roles = EVENT_ROLES[type]
  let phrase = pick(PHRASES[type])
    .replace('{table}', table)
    .replace('{item}', extra?.item_name || '')
    .replace('{quantity}', extra?.item_quantity ?? '')

  speakText(phrase, ttsVoice)

  if (type === 'call_waiter') {
    playCallWaiterSound()
  }
}

export function useWaiterNotifications() {
  const ws = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const user = useAppStore((s) => s.user)
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled)
  const ttsVoice = usePreferencesStore((s) => s.ttsVoice)
  const addNotification = useNotificationsStore((s) => s.addNotification)

  const role = user?.role

  useEffect(() => {
    if (!role) return
    const r = role

    let mounted = true

    function connect() {
      const wsUrl = import.meta.env.VITE_WS_URL
        || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

      if (!wsUrl || wsUrl === 'none') return

      try {
        const socket = new WebSocket(`${wsUrl}/ws/waiters/`)

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const eventType = data.type as EventType

            if (!eventType || !PHRASES[eventType]) return

            const roles = EVENT_ROLES[eventType]
            if (!roles.includes(r)) return

            const table = data.table_number || data.table || '—'

            if (soundEnabled) {
              handleEvent(eventType, table, ttsVoice, data)
            }

            const detailMsg = eventType === 'new_order' ? ' — pedido enviado a cocina'
              : eventType === 'order_ready' ? ' — pedido listo para servir'
              : eventType === 'item_ready' ? ` — ${data.item_name || 'plato'} listo`
              : ' solicita asistencia'

            addNotification({
              title: NOTIFICATION_TITLES[eventType],
              message: `Mesa ${table}${detailMsg}`,
              type: NOTIFICATION_ICONS[eventType] as any,
            })

            if (data.reason) {
              addNotification({
                title: 'Nota',
                message: data.reason,
                type: 'info',
              })
            }
          } catch {}
        }

        socket.onclose = () => {
          ws.current = null
          if (mounted) {
            retryRef.current = setTimeout(connect, 5000)
          }
        }

        ws.current = socket
      } catch {
        if (mounted) {
          retryRef.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      mounted = false
      clearTimeout(retryRef.current)
      try { ws.current?.close() } catch {}
      ws.current = null
    }
  }, [role, soundEnabled, ttsVoice, addNotification])
}
