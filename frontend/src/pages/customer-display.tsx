import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Order, OrderItem } from '@/types'

export function CustomerDisplay() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) { setError('ID de orden no proporcionado'); setLoading(false); return }
    const fetchOrder = async () => {
      try {
        const data = await api<Order>(`/pos/orders/${orderId}/`)
        setOrder(data)
      } catch { setError('No se pudo cargar la orden') }
      setLoading(false)
    }
    fetchOrder()
    const interval = setInterval(fetchOrder, 30000)
    return () => clearInterval(interval)
  }, [orderId])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-lg text-muted-foreground">{error || 'Orden no encontrada'}</p>
    </div>
  )

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const itbis = subtotal * 0.18
  const propina = subtotal * 0.10
  const total = subtotal + itbis + propina

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex flex-col">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3">
            <img src="/logo.png" alt="D'Yiya" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold">D'Yiya</h1>
          <p className="text-muted-foreground">
            {order.table_number ? `Mesa ${order.table_number}` : 'Su orden'}
            {order.order_type === 'takeaway' ? ' · Para llevar' : order.order_type === 'delivery' ? ' · Delivery' : ''}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="divide-y">
            {order.items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-8 text-right tabular-nums">{item.quantity}x</span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.modifiers_json?.length > 0 && (
                      <p className="text-xs text-muted-foreground">{item.modifiers_json.map(m => m.name).join(', ')}</p>
                    )}
                  </div>
                </div>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
              </motion.div>
            ))}
          </div>

          <div className="border-t p-4 space-y-2 bg-muted/20">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ITBIS (18%)</span>
              <span className="tabular-nums">{formatCurrency(itbis)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Propina (10%)</span>
              <span className="tabular-nums">{formatCurrency(propina)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="tabular-nums text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {order.status === 'paid' ? '✓ Pagado' : order.status === 'cancelled' ? '✗ Cancelado' : `· ${order.items.filter(i => i.status !== 'served').length} plato(s) pendiente(s)`}
        </p>
      </motion.div>
    </div>
  )
}
