import { useEffect, useState, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { orders as ordersApi } from '@/services/api'
import { cn } from '@/lib/utils'
import { playKitchenChime, speakText } from '@/lib/sound'
import { toast } from '@/stores/toast-store'
import { useNotificationsStore } from '@/stores/notifications-store'
import {
  ChefHat, CheckCircle2, Bell, BellOff,
  Clock, User, ChefHatIcon,
} from 'lucide-react'
import type { Order, OrderItem } from '@/types'

function getTimerInfo(elapsed: number) {
  if (elapsed < 20) return { badge: 'bg-[var(--samana)]', border: 'border-[var(--samana)]', pulse: false }
  if (elapsed < 40) return { badge: 'bg-[var(--sol)]', border: 'border-[var(--sol)]', pulse: false }
  return { badge: 'bg-[var(--coral)]', border: 'border-[var(--coral)]', pulse: true }
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col animate-pulse">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="p-4 space-y-2 flex-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 pt-0">
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [showRecents, setShowRecents] = useState(false)
  const [station, setStation] = useState('todo')
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('kds-sound') !== 'off'
  })
  const [callingTable, setCallingTable] = useState<string | null>(null)
  const prevOrderIds = useRef<string[]>([])
  const initialFetchDone = useRef(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const ws = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addNotification = useNotificationsStore((s) => s.addNotification)

  useEffect(() => { localStorage.setItem('kds-sound', soundEnabled ? 'on' : 'off') }, [soundEnabled])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])

  const speakOrders = useCallback((ordersToSpeak: Order[]) => {
    const validOrders = ordersToSpeak.map(order => {
      const mesaText = `Mesa ${order.table_number}.`
      const platosText = order.items
        .filter((i) => i.status !== 'ready' && i.status !== 'cancelled')
        .map((i) => `${i.quantity} ${i.name}`)
        .join(', ')
      return platosText ? `${mesaText} prepararse: ${platosText}` : ''
    }).filter(Boolean)

    if (validOrders.length === 0) return

    const fullText = validOrders.join('. ')
    speakText(fullText)
  }, [])

  useEffect(() => {
    const currentIds = orders.map((o) => o.id)
    
    if (initialFetchDone.current) {
      const newOrders = orders.filter((o) => !prevOrderIds.current.includes(o.id))
      if (newOrders.length > 0 && soundEnabled) {
        const isUrgent = newOrders.some(o => 
          o.items.some(i => i.status === 'in_kitchen' && i.name.toLowerCase().includes('vip'))
        )
        playKitchenChime(isUrgent ? 'urgent' : 'normal')
        speakOrders(newOrders)
      }
    }
    prevOrderIds.current = currentIds
  }, [orders, soundEnabled, speakOrders])

  const fetchOrders = useCallback(async () => {
    try {
      const data = await ordersApi.list('?status=in_kitchen')
      setOrders(data)
      const recentData = await ordersApi.list('?status=ready')
      setRecentOrders(recentData.slice(0, 5))
    } catch {}
  }, [])

  useEffect(() => {
    fetchOrders().finally(() => {
      setLoading(false)
      initialFetchDone.current = true
    })

    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    let reconnectTimer: ReturnType<typeof setTimeout>
    if (wsUrl && wsUrl !== 'none') {
      function connect() {
        try {
          const socket = new WebSocket(`${wsUrl}/ws/kds/`)
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.type === 'new_order' || data.type === 'order_update') {
                fetchOrders()
              }
            } catch {}
          }
          socket.onclose = () => {
            reconnectTimer = setTimeout(connect, 5000)
          }
          socket.onerror = () => {
            socket.close()
          }
          ws.current = socket
        } catch {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
      connect()
    }

    pollRef.current = setInterval(fetchOrders, 10000)

    return () => {
      clearTimeout(reconnectTimer)
      if (pollRef.current) clearInterval(pollRef.current)
      try { ws.current?.close() } catch {}
    }
  }, [fetchOrders])

  const handleCallWaiter = async (order: Order) => {
    if (callingTable) return
    setCallingTable(order.id)
    try {
      await ordersApi.callWaiter(order.id)
      toast(`✅ Mesero llamado a Mesa ${order.table_number}`, 'success')
      addNotification({
        title: 'Mesero solicitado',
        message: `Cocina solicita mesero para Mesa ${order.table_number}`,
        type: 'warning',
      })
    } catch {
      toast('Error al llamar mesero', 'error')
    } finally {
      setTimeout(() => setCallingTable(null), 3000)
    }
  }

  const activeStations = new Set<string>()
  orders.forEach(o => {
    o.items.forEach(i => {
      if (i.status !== 'cancelled' && i.category_name) {
        activeStations.add(i.category_name)
      }
    })
  })

  const stations = [
    { id: 'todo', label: 'Todo' },
    ...Array.from(activeStations).sort().map(s => ({ id: s, label: s }))
  ]

  const pending = orders.filter((o) => {
    if (station === 'todo') return o.items.some(i => i.status !== 'cancelled' && i.status !== 'ready')
    return o.items.some((i) => i.status !== 'cancelled' && i.status !== 'ready' && i.category_name === station)
  })

  const markItemComplete = async (orderId: string, itemId: string) => {
    try {
      await ordersApi.completeItem(orderId, itemId)
      fetchOrders()
    } catch {}
  }

  const handleRecall = async (orderId: string, itemId: string) => {
    try {
      await ordersApi.recallItem(orderId, itemId)
      fetchOrders()
      setShowRecents(false)
    } catch {}
  }

  const markAllComplete = async (order: Order) => {
    const pendingItems = order.items.filter((i) => 
      i.status !== 'ready' && i.status !== 'cancelled' && (station === 'todo' || i.category_name === station)
    )
    for (const item of pendingItems) {
      await markItemComplete(order.id, item.id)
    }
  }

  const handleMark86 = async (orderId: string, itemId: string) => {
    if (!confirm('¿Seguro que quieres marcar este ítem como Agotado (86)? Esto cancelará el plato y bloqueará futuras ventas.')) return
    try {
      await ordersApi.mark86(orderId, itemId)
      fetchOrders()
    } catch {}
  }

  const activeItemCount = orders.reduce(
    (sum, o) => sum + o.items.filter((i) => i.status !== 'ready' && i.status !== 'cancelled').length, 0,
  )

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Cocina</h1>
            <Badge variant="caribe" className="font-normal h-6 gap-1.5">
              <ChefHatIcon className="w-3.5 h-3.5" />
              {activeItemCount} comanda{activeItemCount !== 1 ? 's' : ''} activa{activeItemCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowRecents(!showRecents)}
              className={cn(showRecents && 'bg-muted', 'text-xs')}>
              <Clock className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Recientes</span>
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(soundEnabled && 'border-[var(--samana)] text-[var(--samana)]')}
              title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          {stations.map((s) => (
            <Button key={s.id} variant={station === s.id ? 'default' : 'outline'} size="sm"
              onClick={() => setStation(s.id)} className="text-xs whitespace-nowrap shrink-0">
              {s.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {showRecents ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-auto border rounded-xl bg-card p-4">
          <h2 className="text-lg font-bold mb-4">Completados Recientes (Toca para deshacer)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recentOrders.map(order => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="font-bold mb-2">Mesa {order.table_number}</div>
                <div className="space-y-1">
                  {order.items.filter(i => i.status === 'ready').map(item => (
                    <div key={item.id} onClick={() => handleRecall(order.id, item.id)}
                      className="flex justify-between items-center p-2 bg-muted rounded cursor-pointer hover:bg-destructive/10 hover:text-destructive group transition-colors">
                      <span className="text-sm line-through group-hover:no-underline">{item.quantity}x {item.name}</span>
                      <span className="text-xs font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100">Deshacer</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-muted-foreground">No hay completados recientes.</p>}
          </div>
        </motion.div>
      ) : loading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </motion.div>
      ) : pending.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <ChefHat className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-medium text-muted-foreground mb-1">Sin comandas activas</p>
          <p className="text-sm text-[var(--samana)]">La cocina está al día ✓</p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 flex-1">
          <AnimatePresence mode="popLayout">
            {pending.map((order) => {
              const elapsed = Math.floor((now - new Date(order.created_at).getTime()) / 60000)
              const timer = getTimerInfo(elapsed)
              const nonCancelled = order.items.filter((i) => 
                i.status !== 'cancelled' && (station === 'todo' || i.category_name === station)
              )
              const allReady = nonCancelled.length > 0 && nonCancelled.every((i) => i.status === 'ready')

              return (
                <motion.div key={order.id} layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={cn(
                    'rounded-xl border-2 bg-card flex flex-col overflow-hidden',
                    'transition-[border-color] duration-300',
                    timer.border,
                  )}
                >
                  <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold leading-none">Mesa {order.table_number}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {order.waiter_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={timer.pulse ? { scale: [1, 1.06, 1] } : {}}
                        transition={timer.pulse ? { repeat: Infinity, duration: 2 } : {}}
                      >
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white leading-none',
                          timer.badge,
                        )}>
                          <Clock className="w-3 h-3" />
                          {elapsed} min
                        </span>
                      </motion.div>
                      <Button variant="ghost" size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); markAllComplete(order) }}
                        disabled={allReady}
                        className="text-muted-foreground hover:text-[var(--samana)]"
                        title="Marcar todo listo">
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 pt-3 space-y-1.5 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: '40vh' }}>
                    {nonCancelled.map((item) => (
                      <KDSItemRow key={item.id} item={item} elapsed={elapsed}
                        onComplete={() => markItemComplete(order.id, item.id)}
                        onMark86={() => handleMark86(order.id, item.id)} />
                    ))}
                  </div>

                  <div className="p-4 pt-3 mt-auto border-t border-border">
                    <Button variant={callingTable === order.id ? 'default' : 'outline'} size="sm"
                      onClick={() => handleCallWaiter(order)}
                      disabled={callingTable === order.id}
                      className="w-full text-xs gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {callingTable === order.id ? 'Llamando...' : 'Llamar mesero'}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

function KDSItemRow({ item, elapsed, onComplete, onMark86 }: {
  item: OrderItem; elapsed: number; onComplete: () => void; onMark86?: () => void
}) {
  const isReady = item.status === 'ready'
  const isCancelled = item.status === 'cancelled'
  if (isCancelled) return null

  const hasModifiers = item.modifiers_json.length > 0

  return (
    <motion.div layout
      className={cn(
        'group flex items-start gap-3 p-2.5 rounded-lg transition-all duration-150 relative',
        isReady
          ? 'opacity-40'
          : 'hover:bg-muted/30',
      )}
    >
      <div 
        onClick={onComplete}
        className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold shrink-0 leading-none transition-colors cursor-pointer active:scale-[0.98]',
        isReady
          ? 'bg-[var(--samana)]/10 text-[var(--samana)]'
          : 'bg-muted text-foreground hover:bg-[var(--samana)] hover:text-white',
      )}>
        {isReady ? <CheckCircle2 className="w-4 h-4" /> : item.quantity}
      </div>

      <div className="flex-1 min-w-0 pt-0.5 cursor-pointer" onClick={onComplete}>
        <span className={cn(
          'text-sm block truncate leading-tight',
          isReady && 'line-through',
        )}>
          {item.name}
        </span>
        {hasModifiers && (
          <span className="text-[11px] text-[var(--coral)] block truncate mt-0.5 leading-tight">
            {item.modifiers_json.map((m) => m.name).join(', ')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isReady && onMark86 && (
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onMark86() }}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive transition-opacity" title="Marcar Agotado (86)">
            <span className="text-[10px] font-bold">86</span>
          </Button>
        )}
        {!isReady && elapsed > (item.preparation_time || 15) && (
          <span className="shrink-0 text-[10px] text-[var(--coral)] font-medium animate-pulse mt-0.5">
            Urgente
          </span>
        )}
      </div>
    </motion.div>
  )
}
