import { useEffect, useState, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { tables as tablesApi, orders as ordersApi } from '@/services/api'
import { cn } from '@/lib/utils'
import {
  Plus, Users, Timer, AlertTriangle,
  UtensilsCrossed, Settings, Map, LayoutGrid, ArrowRightLeft, CreditCard
} from 'lucide-react'
import type { Table, Order } from '@/types'

type TableStyleKey = 'available' | 'occupied_early' | 'occupied_mid' | 'occupied_late' | 'bill' | 'reserved'

const STATUS_STYLES: Record<TableStyleKey, {
  border: string; bg: string; dot: string; text: string; label: string
}> = {
  available: {
    border: 'border-success/40',
    bg: 'bg-success/10',
    dot: 'bg-success',
    text: 'text-success',
    label: 'Libre',
  },
  occupied_early: {
    border: 'border-primary/40',
    bg: 'bg-primary/10',
    dot: 'bg-primary',
    text: 'text-primary',
    label: 'Ocupada',
  },
  occupied_mid: {
    border: 'border-warning/40',
    bg: 'bg-warning/10',
    dot: 'bg-warning',
    text: 'text-warning',
    label: 'Ocupada',
  },
  occupied_late: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/10',
    dot: 'bg-destructive',
    text: 'text-destructive',
    label: 'Alerta',
  },
  bill: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-500',
    text: 'text-purple-400',
    label: 'Cuenta',
  },
  reserved: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-500',
    text: 'text-purple-400',
    label: 'Reservada',
  },
}

function getStatusKey(table: Table, elapsed: number): TableStyleKey {
  if (table.status === 'available') return 'available'
  if (table.status === 'reserved') return 'reserved'
  if (table.status === 'bill') return 'bill'
  if (table.status === 'occupied') {
    if (elapsed < 45) return 'occupied_early'
    if (elapsed < 90) return 'occupied_mid'
    return 'occupied_late'
  }
  return 'available'
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

function useOccupiedTimers(tables: Table[]) {
  const [timers, setTimers] = useState<Record<number, number>>({})
  const prevStatuses = useRef<Record<number, string>>({})

  useEffect(() => {
    const now = Date.now()
    setTimers((prev) => {
      const next = { ...prev }
      for (const t of tables) {
        const prevStatus = prevStatuses.current[t.id]
        if (t.status === 'occupied' && prevStatus !== 'occupied') {
          next[t.id] = now
        } else if (t.status !== 'occupied') {
          delete next[t.id]
        }
      }
      return next
    })
    prevStatuses.current = Object.fromEntries(tables.map((t) => [t.id, t.status]))
  }, [tables])

  return timers
}

export function FloorPlanPage() {
  const { tables, setTables, setActiveTable, setActiveOrder, user } = useAppStore()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)
  const [filter, setFilter] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [guests, setGuests] = useState(2)
  const [now, setNow] = useState(Date.now())
  const [flashId, setFlashId] = useState<number | null>(null)
  const occupiedTimers = useOccupiedTimers(tables)

  // Floor Plan Pro features
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [transferMode, setTransferMode] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tablesApi.list().then(setTables).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const filtered = filter === 'Todas' ? tables : tables.filter((t) => t.section === filter)

  const freeCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied' || t.status === 'bill').length
  const alertCount = tables.filter((t) => {
    if (t.status !== 'occupied' || !occupiedTimers[t.id]) return false
    return Math.floor((now - occupiedTimers[t.id]) / 60000) >= 45
  }).length

  const isAdmin = user?.role === 'admin'

  const handleClick = useCallback((table: Table) => {
    if (transferMode && openId) {
      executeTransfer(openId, table.id)
      return
    }
    setFlashId(table.id)
    setTimeout(() => {
      setFlashId(null)
      setOpenId(table.id)
      setGuests(2)
    }, 200)
  }, [transferMode, openId])

  const handleDragEnd = async (table: Table, info: any) => {
    if (!isAdmin) return
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2)
    if (distance < 5) {
      const isTargetForTransfer = transferMode && table.status === 'available'
      if (transferMode && !isTargetForTransfer) return;
      handleClick(table)
      return
    }
    
    const x = Math.max(0, (table.x || 0) + info.offset.x)
    const y = Math.max(0, (table.y || 0) + info.offset.y)
    try {
      const updatedTable = await tablesApi.move(table.id, x, y)
      setTables(tables.map(t => t.id === updatedTable.id ? updatedTable : t))
    } catch (e) {
      console.error(e)
    }
  }

  const executeTransfer = async (oldTableId: number, newTableId: number) => {
    try {
      // Fetch open orders for oldTable
      const allOrders = await ordersApi.list(`?table=${oldTableId}`)
      const activeOrder = allOrders.find(o => o.status !== 'paid' && o.status !== 'cancelled')
      
      if (activeOrder) {
        await ordersApi.transfer(activeOrder.id, newTableId)
        const updated = await tablesApi.list()
        setTables(updated)
      }
    } catch (e) {
      console.error(e)
    }
    setTransferMode(false)
    setOpenId(null)
  }

  const confirmOpen = async () => {
    if (!openId) return
    try {
      const order = await tablesApi.open(openId, guests)
      setActiveTable(openId)
      setActiveOrder(order.id)
      setActiveModule('pos')
      const updated = await tablesApi.list()
      setTables(updated)
    } catch {}
    setOpenId(null)
  }

  const sections = ['Todas', 'Interior', 'Terraza', 'Barra', 'VIP']

  const activeTable = tables.find(t => t.id === openId)

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Plano de Mesas</h1>
            <div className="flex items-center gap-2 text-xs hidden md:flex">
              <Badge variant="outline" className="font-normal h-6 gap-1.5 bg-background">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {freeCount} libre{freeCount !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="font-normal h-6 gap-1.5 bg-background">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {occupiedCount} ocupada{occupiedCount !== 1 ? 's' : ''}
              </Badge>
              {alertCount > 0 && (
                <Badge variant="outline" className="font-normal h-6 gap-1.5 bg-background border-destructive text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {alertCount} con alerta
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg flex">
              <Button variant="ghost" onClick={() => setViewMode('grid')} className={cn("h-8 px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-2", viewMode === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="w-4 h-4" /> Cuadrícula
              </Button>
              <Button variant="ghost" onClick={() => setViewMode('map')} className={cn("h-8 px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-2", viewMode === 'map' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Map className="w-4 h-4" /> Físico
              </Button>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs hidden sm:flex">
                <Plus className="w-4 h-4" /> Nueva Mesa
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {sections.map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setFilter(s)} className="text-xs whitespace-nowrap shrink-0">
              {s}
              {s !== 'Todas' && (
                <span className="ml-1 opacity-60">
                  {tables.filter((t) => t.section === s).length}
                </span>
              )}
            </Button>
          ))}
        </div>
      </motion.div>

      {transferMode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm flex items-center justify-between text-primary">
          <span className="font-medium flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> 
            Modo Transferencia: Selecciona la nueva mesa libre para el cliente de la mesa {activeTable?.number}.
          </span>
          <Button variant="outline" size="sm" onClick={() => setTransferMode(false)}>Cancelar</Button>
        </motion.div>
      )}

      <motion.div layout className="flex-1 relative">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <TableSkeleton key={i} />)}
          </motion.div>
        ) : tables.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-muted-foreground mb-1">No hay mesas configuradas</p>
            <p className="text-sm text-muted-foreground/60 mb-5">Agrega mesas desde Configuración para comenzar</p>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Settings className="w-4 h-4" />
                Configurar mesas
              </Button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((table) => {
                const elapsed = table.status === 'occupied' && occupiedTimers[table.id]
                  ? Math.floor((now - occupiedTimers[table.id]) / 60000)
                  : 0
                const key = getStatusKey(table, elapsed)
                const style = STATUS_STYLES[key]
                const isLate = key === 'occupied_late'
                const isBill = table.status === 'bill'
                const isReserved = table.status === 'reserved'
                const isOccupied = table.status === 'occupied'
                const showAlert = isLate
                const isTargetForTransfer = transferMode && table.status === 'available'

                return (
                  <motion.div key={table.id} layout
                    initial={{ opacity: 0, scale: 0.9, y: 12 }}
                    animate={{
                      opacity: transferMode && !isTargetForTransfer && table.id !== openId ? 0.3 : 1,
                      scale: isLate ? [1, 1.02, 1] : 1,
                      y: 0,
                      transition: isLate
                        ? { scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }
                        : { duration: 0.3 },
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: -12 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    whileHover={{ scale: transferMode && !isTargetForTransfer ? 1 : 1.03 }}
                    whileTap={{ scale: transferMode && !isTargetForTransfer ? 1 : 0.97 }}
                    onClick={() => {
                      if (transferMode && !isTargetForTransfer) return;
                      handleClick(table)
                    }}
                    className={cn(
                      'rounded-xl border-2 cursor-pointer p-4 sm:p-5 transition-all duration-150',
                      'hover:shadow-lg',
                      style.bg, style.border,
                      flashId === table.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                      isTargetForTransfer && 'border-dashed border-primary animate-pulse'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-lg sm:text-[22px] font-bold leading-none tracking-tight">
                        {table.number}
                      </span>
                      <span className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium leading-none',
                        style.bg, style.text,
                      )}>
                        {isBill && 'Cuenta'}
                        {isReserved && 'Reservada'}
                        {isOccupied && !isLate && `${elapsed} min`}
                        {isLate && (
                          <><AlertTriangle className="w-3 h-3" /> {elapsed} min</>
                        )}
                        {!isOccupied && !isBill && !isReserved && style.label}
                        {key === 'available' && style.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span>{table.section}</span>
                    </div>

                    {showAlert && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-destructive/20 text-[11px] text-destructive flex items-center gap-1.5">
                        <Timer className="w-3 h-3" />
                        Alertar al mesero
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div ref={mapRef} className="absolute inset-0 bg-[url('/blueprint.png')] bg-repeat bg-[length:100px_100px] border rounded-xl overflow-hidden touch-none"
               style={{ backgroundColor: 'hsl(var(--muted)/0.3)' }}>
            {filtered.map((table) => {
              const elapsed = table.status === 'occupied' && occupiedTimers[table.id]
                ? Math.floor((now - occupiedTimers[table.id]) / 60000)
                : 0
              const key = getStatusKey(table, elapsed)
              const style = STATUS_STYLES[key]
              const isTargetForTransfer = transferMode && table.status === 'available'

              return (
                <motion.div
                  key={`${table.id}-${table.x}-${table.y}`}
                  drag={isAdmin && !transferMode}
                  dragMomentum={false}
                  onDragEnd={(e, info) => handleDragEnd(table, info)}
                  initial={{ x: table.x || 0, y: table.y || 0 }}
                  animate={{ x: table.x || 0, y: table.y || 0, opacity: transferMode && !isTargetForTransfer && table.id !== openId ? 0.3 : 1 }}
                  whileHover={{ scale: transferMode && !isTargetForTransfer ? 1 : 1.05 }}
                  whileTap={isAdmin && !transferMode ? { scale: 1.1, cursor: 'grabbing' } : { scale: 0.95 }}
                  onClick={() => {
                     // handled by handleDragEnd if draggable, otherwise click
                     if (isAdmin && !transferMode) return;
                     const isTargetForTransfer = transferMode && table.status === 'available'
                     if (transferMode && !isTargetForTransfer) return;
                     handleClick(table)
                  }}
                  className={cn(
                    'absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex flex-col items-center justify-center shadow-lg transition-colors cursor-pointer',
                    style.bg, style.border, style.text,
                    isAdmin && !transferMode ? 'cursor-grab active:cursor-grabbing' : '',
                    isTargetForTransfer && 'border-dashed border-primary animate-pulse'
                  )}
                >
                  <span className="font-bold text-lg sm:text-2xl drop-shadow-sm">{table.number}</span>
                  <span className="text-[9px] sm:text-[10px] font-medium opacity-80 mt-1">{style.label || `${elapsed}m`}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-wrap items-center gap-2 sm:gap-4 pt-3 border-t border-border text-[11px] text-muted-foreground z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-success/40" /> Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary/40" /> &lt;45 min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-warning/40" /> 45-90 min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-destructive/40" /> &gt;90 min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40" /> Cuenta / Reservada
        </span>
      </motion.div>

      <AnimatePresence>
        {openId && activeTable && !transferMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setOpenId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-card border rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", STATUS_STYLES[getStatusKey(activeTable, 0)].bg)}>
                  <UtensilsCrossed className={cn("w-5 h-5", STATUS_STYLES[getStatusKey(activeTable, 0)].text)} />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Opciones de Mesa {activeTable.number}</h3>
                  <p className="text-xs text-muted-foreground">{activeTable.section}</p>
                </div>
              </div>
              
              {activeTable.status === 'available' ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span className="text-sm text-muted-foreground">Mesero</span>
                      <span className="text-sm font-medium">{user?.first_name || user?.username}</span>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Comensales</label>
                      <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="icon"
                          onClick={() => setGuests(Math.max(1, guests - 1))}
                          className="rounded-xl w-10 h-10 text-lg">−</Button>
                        <span className="text-2xl font-bold w-10 text-center tabular-nums">{guests}</span>
                        <Button variant="outline" size="icon"
                          onClick={() => setGuests(Math.min(20, guests + 1))}
                          className="rounded-xl w-10 h-10 text-lg">+</Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={() => setOpenId(null)}>Cancelar</Button>
                    <Button className="flex-1 gap-2" onClick={confirmOpen}>
                      <Users className="w-4 h-4" />
                      Abrir
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button className="w-full justify-start h-12" onClick={async () => {
                    setOpenId(null)
                    setActiveOrder(null)
                    setActiveTable(activeTable.id)
                    try {
                      const order = await ordersApi.getActiveByTable(activeTable.id)
                      if (order) setActiveOrder(order.id)
                    } catch {}
                    setActiveModule('pos')
                  }}>
                    <UtensilsCrossed className="w-5 h-5 mr-3 opacity-70" />
                    Ir a la Orden
                  </Button>
                  
                  {activeTable.status === 'bill' && (
                    <Button className="w-full justify-start h-12 bg-purple-600 hover:bg-purple-700 text-white" onClick={async () => {
                      setOpenId(null)
                      setActiveOrder(null)
                      setActiveTable(activeTable.id)
                      try {
                        const order = await ordersApi.getActiveByTable(activeTable.id)
                        if (order) setActiveOrder(order.id)
                      } catch {}
                      setActiveModule('cashier')
                    }}>
                      <CreditCard className="w-5 h-5 mr-3 opacity-70" />
                      Ir a Cobrar
                    </Button>
                  )}
                  
                  <Button variant="outline" className="w-full justify-start h-12" onClick={() => {
                    setTransferMode(true)
                  }}>
                    <ArrowRightLeft className="w-5 h-5 mr-3 opacity-70" />
                    Transferir Cliente
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
