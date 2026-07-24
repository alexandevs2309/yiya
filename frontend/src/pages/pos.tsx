import { useEffect, useState, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { api, menu as menuApi, orders as ordersApi, tables } from '@/services/api'
import { PinAuthModal } from '@/components/ui/pin-auth-modal'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search, ShoppingCart, Send, CreditCard, Plus,
  Minus, Trash2, ArrowLeft, UtensilsCrossed, X,
  Fish, Shell, Wine, CakeSlice, Salad, Soup, MessageSquare, Ban, Loader2, Package, Bike, Monitor,
} from 'lucide-react'
import type { MenuItem, ModifierGroup, ModifierOption, OrderItem } from '@/types'
import { toast } from '@/stores/toast-store'
import { BottomSheet, useBottomSheetStore } from '@/components/BottomSheet'

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; active: string; icon?: React.ReactNode }> = {
  Entradas: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <Salad className="w-3.5 h-3.5" /> },
  Pescados: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <Fish className="w-3.5 h-3.5" /> },
  Mariscos: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <Shell className="w-3.5 h-3.5" /> },
  Criolla: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <Soup className="w-3.5 h-3.5" /> },
  Bebidas: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <Wine className="w-3.5 h-3.5" /> },
  Postres: { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <CakeSlice className="w-3.5 h-3.5" /> },
}

const DEFAULT_CAT_COLOR = { bg: 'bg-muted', border: 'border-transparent', text: 'text-foreground', active: 'bg-primary text-primary-foreground', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> }

function getCatColor(name: string) {
  const key = Object.keys(CATEGORY_COLORS).find(k => k.toLowerCase() === name.toLowerCase())
  return key ? CATEGORY_COLORS[key] : DEFAULT_CAT_COLOR
}

function highlightText(text: string, query: string) {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-primary/20 text-inherit rounded-sm px-0.5">{part}</mark>
      : part,
  )
}

function getTimerDot(elapsed: number) {
  if (elapsed < 45) return 'bg-success'
  if (elapsed < 90) return 'bg-warning'
  return 'bg-destructive'
}

export function POSPage() {
  const { activeTableId, activeOrderId, menuItems, setMenuItems, tables: storeTables } = useAppStore()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)
  const [cat, setCat] = useState('')
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState<import('@/types').Order | null>(null)
  const [modItem, setModItem] = useState<MenuItem | null>(null)
  const [selections, setSelections] = useState<Record<number, ModifierOption[]>>({})
  const [kitchenNote, setKitchenNote] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [originCoords, setOriginCoords] = useState<{x: number, y: number} | null>(null)
  const [flyingItems, setFlyingItems] = useState<{ id: string; x: number; y: number; item: MenuItem }[]>([])
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  useEffect(() => {
    if (order && order.items.length > 0) {
      useBottomSheetStore.getState().open()
    } else {
      useBottomSheetStore.getState().close()
    }
  }, [order?.items.length])
  const handleScanBarcode = useCallback(async (code: string) => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    setBarcodeScanning(true)
    try {
      const item = await api<MenuItem>(`/pos/menu-items/lookup_barcode/?barcode=${encodeURIComponent(code)}`)
      if (item) {
        const price = item.effective_price ? parseFloat(item.effective_price as any) : item.price
        await ordersApi.addItem(orderId, {
          menu_item: item.id,
          name: item.name,
          price,
          quantity: 1,
          seat: 1,
          status: 'pending',
          modifiers_json: [],
        })
        const updated = await ordersApi.get(orderId)
        setOrder(updated)
        toast(`Producto agregado: ${item.name}`, 'success')
        setSearch('')
      }
    } catch {
      toast('Código de barras no encontrado', 'error')
    }
    setBarcodeScanning(false)
  }, [])

  useEffect(() => {
    menuApi.list().then(setMenuItems).catch(() => {})
  }, [])

  const fetchOrder = useCallback(async () => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    try {
      const data = await ordersApi.get(orderId)
      if (data.status === 'paid' || data.status === 'cancelled') {
        useAppStore.getState().setActiveOrder(null)
        setOrder(null)
        alert('Esta orden ya ha sido cerrada o cancelada.')
      } else {
        setOrder(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (activeOrderId) fetchOrder()
  }, [activeOrderId, fetchOrder])

  useEffect(() => {
    if (activeTableId && !activeOrderId) {
      ordersApi.getActiveByTable(activeTableId).then((o) => {
        if (o) {
          useAppStore.getState().setActiveOrder(o.id)
        }
      }).catch(() => {})
    }
  }, [activeTableId, activeOrderId])

  const categories = [...new Set(menuItems.map((i) => i.category_name))]
  const filtered = menuItems.filter(
    (i) => i.is_available && (!cat || i.category_name === cat) &&
      (!search || i.name.toLowerCase().includes(search.toLowerCase())),
  )

  const cartItemCounts: Record<number, number> = {}
  order?.items.forEach((i) => {
    if (i.menu_item !== null) cartItemCounts[i.menu_item] = (cartItemCounts[i.menu_item] || 0) + i.quantity
  })

  const openModifiers = (item: MenuItem, e?: React.MouseEvent) => {
    const currentOrderId = useAppStore.getState().activeOrderId
    if (!currentOrderId) return

    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setOriginCoords({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    } else {
      setOriginCoords(null)
    }

    const initial: Record<number, ModifierOption[]> = {}
    let hasChoices = false

    if (item.modifier_groups && item.modifier_groups.length > 0) {
      item.modifier_groups.forEach((g) => {
        if (g.is_required && g.options.length === 1) {
          initial[g.id] = [g.options[0]]
        } else {
          initial[g.id] = []
          hasChoices = true
        }
      })
    }

    if (!hasChoices) {
      addImmediately(item, initial)
      useBottomSheetStore.getState().open()
      return
    }

    setModItem(item)
    setKitchenNote('')
    setSelections(initial)
    useBottomSheetStore.getState().open()
  }

  const addImmediately = async (item: MenuItem, initialSelections: Record<number, ModifierOption[]>) => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    const modifiers_json = Object.values(initialSelections).flat().map((o) => ({
      name: o.name,
      price_adjustment: o.price_adjustment,
    }))
    const extraPrice = modifiers_json.reduce((s, m) => s + (m.price_adjustment || 0), 0)
    const basePrice = item.effective_price ? parseFloat(item.effective_price as any) : item.price
    const price = basePrice + extraPrice
    try {
      await ordersApi.addItem(orderId, {
        menu_item: item.id,
        name: item.name,
        price,
        quantity: 1,
        seat: 1,
        status: 'pending',
        modifiers_json,
      })
      await fetchOrder()
      if (originCoords) {
        const id = Date.now().toString() + Math.random().toString()
        setFlyingItems(prev => [...prev, { id, x: originCoords.x, y: originCoords.y, item }])
      }
    } catch {}
  }


  const toggleModOption = (groupId: number, opt: ModifierOption) => {
    setSelections((prev) => {
      const group = modItem?.modifier_groups.find((g) => g.id === groupId)
      const current = [...(prev[groupId] || [])]
      const idx = current.findIndex((o) => o.id === opt.id)
      if (idx >= 0) {
        current.splice(idx, 1)
      } else {
        if (group && group.max_selections > 0 && current.length >= group.max_selections) {
          current.shift()
        }
        current.push(opt)
      }
      return { ...prev, [groupId]: current }
    })
  }

  const confirmModifiers = async () => {
    const orderId = useAppStore.getState().activeOrderId
    if (!modItem || !orderId) return
    const modifiers_json = Object.values(selections).flat().map((o) => ({
      name: o.name,
      price_adjustment: o.price_adjustment,
    }))
    if (kitchenNote.trim()) {
      modifiers_json.push({ name: `Nota: ${kitchenNote.trim()}`, price_adjustment: 0 } as any)
    }
    const extraPrice = modifiers_json.reduce((s, m) => s + (m.price_adjustment || 0), 0)
    const basePrice = modItem.effective_price ? parseFloat(modItem.effective_price as any) : modItem.price
    const price = basePrice + extraPrice
    try {
      await ordersApi.addItem(orderId, {
        menu_item: modItem.id,
        name: modItem.name,
        price,
        quantity: 1,
        seat: 1,
        status: 'pending',
        modifiers_json,
      })
      await fetchOrder()
      if (originCoords) {
        const id = Date.now().toString() + Math.random().toString()
        setFlyingItems(prev => [...prev, { id, x: originCoords.x, y: originCoords.y, item: modItem }])
      }
    } catch {}
    setModItem(null)
  }

  const addItem = async (item: MenuItem) => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    try {
      await ordersApi.addItem(orderId, {
        menu_item: item.id,
        name: item.name,
        price: item.effective_price ? parseFloat(item.effective_price as any) : item.price,
        quantity: 1,
        seat: 1,
        status: 'pending',
        modifiers_json: [],
      })
      await fetchOrder()
    } catch {}
  }

  const updateQty = async (itemId: string, delta: number) => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId || !order) return
    const item = order.items.find((i) => i.id === itemId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty < 1) return
    try {
      await ordersApi.updateItem(orderId, itemId, { quantity: newQty })
      await fetchOrder()
    } catch {}
  }

  const removeItem = async (itemId: string) => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    try {
      await ordersApi.removeItem(orderId, itemId)
      await fetchOrder()
    } catch {}
  }

  const handleCancelOrder = async () => {
    const orderId = useAppStore.getState().activeOrderId
    if (!orderId) return
    try {
      await api(`/pos/orders/${orderId}/cancel/`, { method: 'POST' })
      useAppStore.getState().setActiveOrder(null)
      useAppStore.getState().setActiveTable(null)
      setOrder(null)
      setCancelModalOpen(false)
    } catch (err: any) {
      alert(`Error al cancelar: ${err.message || 'Error desconocido'}`)
      setCancelModalOpen(false)
    }
  }

  const requireOpenRegister = useCallback(async () => {
    try {
      const data = await api<{ count: number }>('/cashregister/registers/?status=open')
      if (data.count === 0) {
        toast('Debe abrir la caja registradora antes de cobrar', 'error')
        setActiveModule('cash-register')
        return false
      }
      return true
    } catch {
      return true
    }
  }, [])

  const subtotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0
  const itbis = subtotal * 0.18
  const propina = subtotal * 0.10
  const total = subtotal + itbis + propina

  useEffect(() => {
    useAppStore.getState().setCurrentSaleTotal(total)
  }, [total])

  if (!activeTableId || !activeOrderId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Sin mesa seleccionada</h2>
          <p className="text-sm text-muted-foreground mb-4">Selecciona una mesa o crea un pedido para llevar</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={async () => {
            try {
              const order = await tables.takeaway()
              useAppStore.getState().setActiveTable(order.table)
              useAppStore.getState().setActiveOrder(order.id)
            } catch {
              toast('Error al crear pedido para llevar', 'error')
            }
          }} className="gap-2 w-full" size="lg">
            <Package className="w-5 h-5" /> Para llevar
          </Button>
          <Button onClick={() => setActiveModule('floor-plan')} variant="outline" className="gap-2 w-full" size="lg">
            <ArrowLeft className="w-4 h-4" /> Seleccionar mesa
          </Button>
        </div>
      </div>
    )
  }

  function renderCartPanels(isMobile: boolean) {
    const baseClass = isMobile ? 'flex flex-col flex-1 min-h-0' : 'absolute inset-0 flex flex-col'
    const modifierClass = isMobile ? 'flex flex-col flex-1 min-h-0' : 'absolute inset-0 z-20 bg-card flex flex-col'
    return (
      <AnimatePresence initial={false} mode="wait">
        {modItem ? (
          <motion.div
            key="modifiers"
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={modifierClass}
          >
            <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setModItem(null)} className="shrink-0 w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate leading-tight">{modItem.name}</h3>
                <p className="text-sm font-medium text-primary">{formatCurrency(modItem.price)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
              {modItem.modifier_groups?.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{group.name}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      {group.is_required && (
                        <Badge variant="secondary" className="px-1.5 py-0">Req</Badge>
                      )}
                      {group.max_selections > 0 && (
                        <span className="text-muted-foreground">Máx {group.max_selections}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const selected = (selections[group.id] || []).some((o) => o.id === opt.id)
                      return (
                        <div key={opt.id}
                          onClick={() => toggleModOption(group.id, opt)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border',
                            selected ? 'bg-primary/10 border-primary/40 shadow-sm' : 'bg-background hover:bg-muted/50 border-border'
                          )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                              selected ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                            )}>
                              {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-sm font-medium">{opt.name}</span>
                          </div>
                          {opt.price_adjustment > 0 && (
                            <span className="text-xs font-bold text-muted-foreground">+{formatCurrency(opt.price_adjustment)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-bold">Nota para cocina</span>
                </div>
                <textarea
                  value={kitchenNote}
                  onChange={(e) => setKitchenNote(e.target.value)}
                  placeholder="Ej. Sin cebolla, poco hielo..."
                  className="w-full h-20 p-3 rounded-xl bg-input border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 shrink-0">
              <Button className="w-full h-12 gap-2 text-base font-bold bg-primary hover:brightness-110 text-white shadow-lg shadow-primary/20" onClick={confirmModifiers}>
                <Plus className="w-5 h-5" />
                Agregar • {formatCurrency(modItem.price + Object.values(selections).flat().reduce((s, o) => s + o.price_adjustment, 0))}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="cart"
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={baseClass}
          >
            <div className="p-5 border-b border-border space-y-1 bg-muted/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full shadow-[0_0_8px_var(--color-success)]',
                      order?.status === 'cancelled' ? 'bg-destructive' : 'bg-success',
                    )} />
                    <h3 className="text-lg font-bold leading-none tracking-tight">
                      {order?.table_number ? `Mesa ${order.table_number}` : 'Para llevar'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {order && (order.status === 'open' || order.status === 'in_kitchen') && (
                      <div className="flex items-center gap-1 mr-1 border-r pr-2 border-border">
                        <Button variant={order.order_type === 'dine-in' ? 'default' : 'ghost'} size="sm"
                          onClick={async () => {
                            if (!order) return
                            await api(`/pos/orders/${order.id}/`, { method: 'PATCH', body: JSON.stringify({ order_type: 'dine-in' }) })
                            setOrder({ ...order, order_type: 'dine-in' })
                          }}
                          className="h-7 px-2 text-xs gap-1" title="En el local">
                          <UtensilsCrossed className="w-3 h-3" />
                        </Button>
                        <Button variant={order.order_type === 'takeaway' ? 'default' : 'ghost'} size="sm"
                          onClick={async () => {
                            if (!order) return
                            await api(`/pos/orders/${order.id}/`, { method: 'PATCH', body: JSON.stringify({ order_type: 'takeaway' }) })
                            setOrder({ ...order, order_type: 'takeaway' })
                          }}
                          className="h-7 px-2 text-xs gap-1" title="Para llevar">
                          <Package className="w-3 h-3" />
                        </Button>
                        <Button variant={order.order_type === 'delivery' ? 'default' : 'ghost'} size="sm"
                          onClick={async () => {
                            if (!order) return
                            await api(`/pos/orders/${order.id}/`, { method: 'PATCH', body: JSON.stringify({ order_type: 'delivery' }) })
                            setOrder({ ...order, order_type: 'delivery' })
                          }}
                          className="h-7 px-2 text-xs gap-1" title="Delivery">
                          <Bike className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {order && order.items.length > 0 && order.status !== 'cancelled' && order.status !== 'paid' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => window.open(`/display/${order.id}`, '_blank')}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 shrink-0"
                          title="Pantalla de cliente">
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setCancelModalOpen(true)}
                          className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 w-8 h-8 shrink-0"
                          title="Cancelar orden">
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {isMobile && (
                      <Button variant="ghost" size="icon" onClick={() => useBottomSheetStore.getState().close()}
                        className="text-muted-foreground hover:text-foreground w-8 h-8 shrink-0">
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              <p className="text-sm text-muted-foreground pl-5">
                {order?.items.length || 0} items · {order?.guests || 1} comensal(es)
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-2">
              <AnimatePresence initial={false}>
                {order?.items.map((item) => {
                  const image = menuItems.find(m => m.id === item.menu_item)?.image
                  return (
                    <CartItemRow key={item.id} item={item} image={image}
                      onIncrement={() => updateQty(item.id, 1)}
                      onDecrement={() => updateQty(item.id, -1)}
                      onRemove={() => removeItem(item.id)} />
                  )
                })}
              </AnimatePresence>

              {(!order?.items || order.items.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mb-5" />
                  <p className="text-base font-semibold">Carrito vacío</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Selecciona platos del menú</p>
                </div>
              )}
            </div>

            <div className="p-5 pt-4 border-t border-border bg-gradient-to-b from-transparent to-muted/10 space-y-2 shrink-0">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>ITBIS (18%)</span>
                <span className="tabular-nums font-medium text-foreground">{formatCurrency(itbis)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Propina (10%)</span>
                <span className="tabular-nums font-medium text-foreground">{formatCurrency(propina)}</span>
              </div>
              <div className="h-px bg-border/60 my-3" />
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {order && order.items.length > 0 && order.status === 'open' && (
                  <Button size="lg" variant="secondary" className="w-full gap-2 text-sm font-semibold h-11"
                    onClick={async () => {
                      const orderId = useAppStore.getState().activeOrderId
                      if (!orderId) return
                      try {
                        const result = await ordersApi.sendToKitchen(orderId)
                        if (result.sent > 0) {
                          setActiveModule('kds')
                        }
                      } catch (err: any) {
                        toast(err?.message || 'Error al enviar a cocina', 'error')
                      }
                    }}>
                    <Send className="w-4 h-4" /> Enviar a Cocina
                  </Button>
                )}
                <div className="flex flex-col gap-3">
                  <Button size="lg" className="w-full gap-2 text-base h-14 font-bold bg-success hover:bg-success/90 text-success-foreground shadow-md transition-all"
                    disabled={!order?.items.length}
                    onClick={async () => {
                      if (await requireOpenRegister()) setActiveModule('cashier')
                    }}>
                    <CreditCard className="w-5 h-5" /> Cobrar Total
                  </Button>
                  <Button variant="outline" size="lg" className="w-full gap-2 text-sm h-11 shadow-sm font-semibold"
                    disabled={!order?.items.length}
                    onClick={async () => {
                      if (!activeTableId) return
                      if (!(await requireOpenRegister())) return
                      await tables.requestBill(activeTableId)
                      setActiveModule('cashier')
                    }}>
                    Imprimir pre-cuenta
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 space-y-4 overflow-auto relative pb-20 md:pb-4">
        <div className="relative max-w-md">
          {barcodeScanning ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <input ref={searchRef} type="text"
            placeholder={barcodeScanning ? 'Escaneando...' : 'Buscar plato o escanear código...'}
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && search.trim() && !menuItems.some(i => i.is_available && i.name.toLowerCase().includes(search.toLowerCase()))) {
                e.preventDefault()
                await handleScanBarcode(search.trim())
              }
            }}
            className="w-full h-10 pl-10 pr-9 rounded-lg bg-input border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          {search && (
            <Button variant="ghost" size="icon" onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-none">
          {categories.map((c) => {
            const cc = getCatColor(c)
            return (
              <Button variant="ghost" key={c}
                onClick={() => setCat(cat === c ? '' : c)}
                className={cn(
                  'shrink-0 flex items-center justify-start gap-2 px-4 py-2 h-auto rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  cat === c ? `${cc.active} font-bold shadow-sm` : `${cc.bg} ${cc.text} hover:brightness-95`,
                )}>
                {cc.icon}
                {c}
              </Button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => {
            const price = item.effective_price ? parseFloat(item.effective_price as any) : item.price
            const inCart = cartItemCounts[item.id] || 0

            return (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="relative group h-full">
                <div
                  onClick={(e) => openModifiers(item, e)}
                  className={cn(
                    'h-full flex flex-col rounded-xl bg-card cursor-pointer overflow-hidden transition-all duration-300',
                    'shadow-sm hover:shadow-md border',
                    inCart > 0 ? 'border-2 border-primary' : 'border-transparent',
                  )}
                >
                  <div className="relative h-20 sm:h-24 md:h-32 bg-muted/50 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity" />
                    {inCart > 0 && (
                       <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                          <span className="text-xs font-bold">{inCart}</span>
</div>
                        )}
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-base sm:text-lg font-bold text-primary tabular-nums leading-none">
                        {formatCurrency(price)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug mb-1 font-sans">
                      {search ? highlightText(item.name, search) : item.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mb-2">{item.category_name}</p>

                    <div className="mt-auto">
                      {item.itbis_type === 'gravado' && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          + ITBIS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Bottom Sheet */}
      {isMobile && (
        <BottomSheet>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="font-bold text-base">{order?.items.length || 0}</span>
              <span className="text-muted-foreground/60 mx-1">·</span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>
            <span className="text-xs text-muted-foreground">Arrastra ↑</span>
          </div>
          {renderCartPanels(true)}
        </BottomSheet>
      )}

      {/* Desktop: Cart lateral */}
      <div className="hidden md:flex bg-card flex-col overflow-hidden w-[380px] border-l relative">
        {renderCartPanels(false)}
      </div>

      <PinAuthModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onAuthorized={handleCancelOrder}
        title="Cancelar Orden"
        description="Esta acción cancelará toda la orden y liberará la mesa. Requiere autorización de administrador."
      />

      {/* Animación Vuelo al Carrito */}
          {flyingItems.map(fly => {
        const catColor = getCatColor(fly.item.category_name)
        return (
          <motion.div
            key={fly.id}
            initial={{ position: 'fixed', left: fly.x - 20, top: fly.y - 20, zIndex: 9999, opacity: 1, scale: 1 }}
            animate={{ left: window.innerWidth - 100, top: 120, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            onAnimationComplete={() => setFlyingItems(prev => prev.filter(f => f.id !== fly.id))}
            className={`pointer-events-none w-12 h-12 rounded-full shadow-2xl flex items-center justify-center ${catColor.active}`}
          >
            {catColor.icon || <UtensilsCrossed className="w-6 h-6" />}
          </motion.div>
        )
      })}
    </div>
  )
}

function CartItemRow({ item, image, onIncrement, onDecrement, onRemove }: {
  item: OrderItem; image?: string; onIncrement: () => void; onDecrement: () => void; onRemove: () => void
}) {
  const hasModifiers = item.modifiers_json.length > 0

  return (
    <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }} transition={{ duration: 0.15 }}
      className="group flex items-start gap-3 p-3 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
      
      <div className="w-12 h-12 rounded-xl bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
        {image ? (
          <img src={image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <UtensilsCrossed className="w-5 h-5 text-muted-foreground/30" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-sm font-semibold truncate leading-tight">{item.name}</span>
          <span className="text-sm font-bold text-primary tabular-nums shrink-0">{formatCurrency(item.price)}</span>
        </div>
        
        {hasModifiers && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight mb-2">
            {item.modifiers_json.map((m) => m.name).join(', ')}
          </p>
        )}
        
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 bg-background rounded-lg border shadow-sm p-0.5">
            <Button variant="ghost" size="icon" onClick={onDecrement}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="text-sm font-semibold w-6 text-center tabular-nums">{item.quantity}</span>
            <Button variant="ghost" size="icon" onClick={onIncrement}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all shrink-0">
        <Trash2 className="w-4 h-4" />
      </Button>
    </motion.div>
  )
}
