import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/services/api'
import { Plus, Minus, ShoppingCart, Send, CheckCircle2, AlertCircle, Loader2, UtensilsCrossed } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/skeleton'

interface KioskItem {
  id: number
  name: string
  price: number
  itbis_type: string
  preparation_time: number
}

interface KioskCategory {
  id: number
  name: string
  items: KioskItem[]
}

interface KioskTable {
  id: number
  number: string
  section: string
  capacity: number
}

interface CartItem {
  menu_item: number
  name: string
  price: number
  quantity: number
}

export function KioskPage() {
  const [token, setToken] = useState('')
  const [table, setTable] = useState<KioskTable | null>(null)
  const [categories, setCategories] = useState<KioskCategory[]>([])
  const [cat, setCat] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) {
      setError('Token de mesa no encontrado')
      setLoading(false)
      return
    }
    setToken(t)
    Promise.all([
      api<KioskTable>(`/pos/kiosk/table/${t}/`).then(setTable).catch(() => setError('Mesa no encontrada')),
      api<KioskCategory[]>('/pos/kiosk/menu/').then(setCategories).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const addToCart = (item: KioskItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item === item.id)
      if (existing) {
        return prev.map((c) => c.menu_item === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menu_item: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const updateQty = (menuItem: number, delta: number) => {
    setCart((prev) => {
      const next = prev.map((c) =>
        c.menu_item === menuItem ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c,
      ).filter((c) => c.quantity > 0)
      return next
    })
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const itbis = subtotal * 0.18
  const total = subtotal + itbis

  const handleSubmit = async () => {
    if (!token || cart.length === 0) return
    setSubmitting(true)
    try {
      const res: any = await api('/pos/kiosk/orders/', {
        method: 'POST',
        body: JSON.stringify({
          table_token: token,
          items: cart.map((c) => ({ menu_item: c.menu_item, quantity: c.quantity })),
          guests: 1,
        }),
      })
      setOrderNumber(res?.id?.slice(0, 8) || '')
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Error al enviar orden')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-bold mb-1">Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="w-full max-w-sm">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
              <h2 className="text-xl font-bold mb-1">¡Orden enviada!</h2>
              <p className="text-sm text-muted-foreground mb-6">Tu orden está en preparación</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Mesa {table?.number} · {table?.section}</p>
                <p>{cart.length} item(s) · {formatCurrency(total)}</p>
                {orderNumber && <p className="font-mono text-[10px] mt-1">Orden #{orderNumber}</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const filteredCategories = categories.map((c) => ({
    ...c,
    items: c.items.filter((i) => !cat || c.name === cat),
  })).filter((c) => c.items.length > 0)

  const allCats = categories.map((c) => c.name)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 pb-32">
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/logo.png" alt="D'Yiya" className="w-7 h-7 rounded" />
            <h1 className="text-xl font-bold">D'Yiya Restaurant</h1>
          </div>
          {table && (
            <p className="text-sm text-muted-foreground">
              Mesa {table.number} · {table.section} · {table.capacity} pers.
            </p>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4">
          {allCats.map((c) => (
            <Button key={c} variant={cat === c ? 'default' : 'outline'} size="sm"
              onClick={() => setCat(cat === c ? '' : c)} className="text-xs whitespace-nowrap shrink-0 transition-all">{c}</Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {filteredCategories.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium">Menú no disponible</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setCat('')}>
                Ver todo
              </Button>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredCategories.flatMap((c) =>
                c.items.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <Card className="cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5" onClick={() => addToCart(item)}>
                      <CardContent className="p-3">
                        <div className="h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                          <UtensilsCrossed className="w-5 h-5 text-primary/60" />
                        </div>
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-primary tabular-nums">{formatCurrency(item.price)}</span>
                          <Badge variant="secondary" className="text-[9px]">{item.preparation_time}min</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
        <div className="max-w-4xl mx-auto">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span>Selecciona platos del menú</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1 max-h-32 overflow-auto">
                {cart.map((item) => (
                  <motion.div key={item.menu_item} layout
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate min-w-0 flex-1">{item.name}</span>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="w-6 h-6 shrink-0"
                        onClick={() => updateQty(item.menu_item, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-5 sm:w-6 text-center font-medium tabular-nums">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="w-6 h-6 shrink-0"
                        onClick={() => updateQty(item.menu_item, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="w-14 sm:w-16 text-right font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
              <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'Enviando...' : 'Enviar a cocina'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
