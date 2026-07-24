import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { useNavigationStore } from '@/stores/navigation-store'
import { api, orders as ordersApi, tables, type ReceiptData } from '@/services/api'
import { Receipt } from '@/components/receipt'
import { PinAuthModal } from '@/components/ui/pin-auth-modal'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle2, CreditCard, DollarSign, Smartphone, Loader2, Calculator, Printer, Users, Percent, UserCheck, AlertTriangle, RefreshCw, FileText, Wallet, Send } from 'lucide-react'
import type { Order } from '@/types'

type PaymentMethod = 'cash' | 'cardnet' | 'tpago' | 'mixed' | null

export function CashierPage() {
  const { activeOrderId, setActiveOrder, setActiveTable } = useAppStore()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>(null)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null)

  const [splitMode, setSplitMode] = useState<'none' | 'equal' | 'items'>('none')
  const [numSplits, setNumSplits] = useState(2)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})

  const [discountType, setDiscountType] = useState<'none' | 'employee' | 'custom'>('none')
  const [customDiscountPct, setCustomDiscountPct] = useState('0')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [deductFromPayroll, setDeductFromPayroll] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [cashRegister, setCashRegister] = useState<any>(null)

  const [pinAuthOpen, setPinAuthOpen] = useState(false)
  const [pinAction, setPinAction] = useState<() => void>(() => {})

  useEffect(() => {
    api<any>('/cashregister/registers/?status=open').then(d => {
      if (d.results?.length) setCashRegister(d.results[0])
    }).catch(() => {})
  }, [])

  const fetchOrder = useCallback(async () => {
    if (!activeOrderId) return
    setLoading(true)
    setError(false)
    try {
      const data = await ordersApi.get(activeOrderId)
      setOrder(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activeOrderId])

  const initialized = useRef(false)
  useEffect(() => {
    if (!activeOrderId && !initialized.current) {
      initialized.current = true
      const tid = useAppStore.getState().activeTableId
      if (tid) {
        ordersApi.getActiveByTable(tid).then(o => { if (o) setActiveOrder(o.id) })
      }
    }
    fetchOrder()
    api('/auth/users/').then((data: any) => {
      setUsers(Array.isArray(data) ? data : (data?.results || []))
    }).catch(() => {})
  }, [fetchOrder])


  // Hotkeys
  useEffect(() => {
    if (!activeOrderId || done || loading || error) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'number') return
      
      if (e.key === 'Enter') {
        e.preventDefault()
        const cashNum = parseFloat(cashReceived) || 0
        const validCash = !(method === 'cash' && cashNum < total)
        const canPay = !processing && !(!deductFromPayroll && (!method || !validCash)) && !(discountType === 'employee' && !selectedEmployeeId)
        
        if (canPay) {
          handlePayClick()
        } else if (!method || (method === 'cash' && cashNum < total)) {
          setMethod('cash')
          setCashReceived(total.toFixed(2))
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (pinAuthOpen) {
          setPinAuthOpen(false)
        } else if (method) {
          setMethod(null)
          setCashReceived('')
        } else {
          setActiveModule('pos')
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }) // No deps array to always have the latest state closures (safe here since it attaches/detaches very fast on every render, but a ref pattern would be better)

  const paidItemsQuantities: Record<string, number> = {}
  const paymentsList = (order as any)?.payments || []
  paymentsList.forEach((p: any) => {
    if (p.items_json) {
      p.items_json.forEach((it: any) => {
        if (it.item_id) {
          paidItemsQuantities[it.item_id] = (paidItemsQuantities[it.item_id] || 0) + it.cantidad
        }
      })
    }
  })

  const totalPaidAlready = paymentsList.reduce((sum: number, p: any) => sum + p.total, 0) || 0
  const fullOrderSubtotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0

  let subtotal = 0
  if (splitMode === 'equal') {
    subtotal = fullOrderSubtotal / numSplits
  } else if (splitMode === 'items') {
    subtotal = order?.items.reduce((sum, item) => {
      const qtyToPay = selectedItems[item.id] || 0
      return sum + (item.price * qtyToPay)
    }, 0) || 0
  } else {
    if (totalPaidAlready > 0) {
      const remainingTotal = (fullOrderSubtotal * 1.28) - totalPaidAlready
      subtotal = remainingTotal / 1.28
    } else {
      subtotal = fullOrderSubtotal
    }
  }

  let discountAmt = 0
  if (discountType === 'employee') {
    discountAmt = subtotal * 0.50
  } else if (discountType === 'custom') {
    const pct = parseFloat(customDiscountPct) || 0
    discountAmt = subtotal * (pct / 100)
  }

  const finalSubtotal = Math.max(0, subtotal - discountAmt)
  const itbis = finalSubtotal * 0.18
  const propina = finalSubtotal * 0.10
  const total = finalSubtotal + itbis + propina

  const cashReceivedNum = parseFloat(cashReceived) || 0
  const change = cashReceivedNum - total
  const isValidCash = !(method === 'cash' && cashReceivedNum < total)

  const handlePayClick = () => {
    if (!activeOrderId || !order) return
    if (discountType !== 'none' || deductFromPayroll) {
      setPinAction(() => () => proceedWithPayment())
      setPinAuthOpen(true)
    } else {
      proceedWithPayment()
    }
  }

  const proceedWithPayment = async () => {
    if (!activeOrderId || !order) return
    setProcessing(true)
    try {
      const res: any = await api('/billing/payments/', {
        method: 'POST',
        body: JSON.stringify({
          order: activeOrderId,
          method: deductFromPayroll ? 'mixed' : (method || 'cash'),
          subtotal: parseFloat(subtotal.toFixed(2)),
          itbis: parseFloat(itbis.toFixed(2)),
          propina: parseFloat(propina.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          cash_received: method === 'cash' && !deductFromPayroll ? parseFloat(cashReceivedNum.toFixed(2)) : null,
          change_given: method === 'cash' && !deductFromPayroll && change >= 0 ? parseFloat(change.toFixed(2)) : null,
          items_json: splitMode === 'items' ? order?.items
            .filter(item => (selectedItems[item.id] || 0) > 0)
            .map(item => ({
              item_id: item.id,
              nombre: item.name,
              cantidad: selectedItems[item.id],
              precio: item.price
            })) : (splitMode === 'equal' ? [{
              item_id: null,
              nombre: `Parte de cuenta (1/${numSplits})`,
              cantidad: 1,
              precio: subtotal
            }] : null),
          employee: discountType === 'employee' ? selectedEmployeeId : null,
          deduct_from_payroll: deductFromPayroll,
          discount_amount: parseFloat(discountAmt.toFixed(2)),
          discount_reason: discountType === 'employee' ? 'Descuento empleado 50%' : discountType === 'custom' ? `Descuento ${customDiscountPct}%` : '',
        }),
      })
      if (res && res.id) {
        setCreatedPaymentId(res.id)
      }
      setDone(true)
    } catch (err: any) {
      alert(`Error al registrar pago: ${err.message || 'Error desconocido'}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDone = () => {
    setActiveOrder(null)
    setActiveTable(null)
    setActiveModule('floor-plan')
  }

  const handleItemQtyChange = (itemId: string, currentVal: number, maxVal: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: Math.min(maxVal, Math.max(0, currentVal))
    }))
  }

  if (!activeOrderId && !done) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-lg font-semibold mb-1">Sin ticket seleccionado</h2>
          <p className="text-sm text-muted-foreground mb-4">Selecciona una mesa con cuenta lista</p>
          <Button onClick={() => setActiveModule('floor-plan')} className="gap-2" size="sm">
            <ArrowLeft className="w-4 h-4" /> Ir al plano
          </Button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <DoneScreen paymentId={createdPaymentId} onDone={handleDone} />
    )
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <CardSkeleton className="h-8 w-24" />
          <CardSkeleton className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton className="h-40" />
            <CardSkeleton className="h-40" />
            <CardSkeleton className="h-48" />
          </div>
          <div>
            <CardSkeleton className="h-80" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Error al cargar orden</h2>
          <p className="text-sm text-muted-foreground mb-4">No se pudo obtener la información de la orden</p>
          <Button onClick={fetchOrder} className="gap-2" size="sm">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl mx-auto font-sans">
      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveModule('pos')} className="gap-1 shrink-0">
          <ArrowLeft className="w-3 h-3" /> Volver
        </Button>
        <h2 className="text-lg sm:text-xl font-bold font-heading min-w-0 truncate flex-1">Cobro de Mesa {order?.table_number}</h2>
        {totalPaidAlready > 0 && (
          <Badge className="bg-success text-success-foreground shrink-0">
            Abonado: {formatCurrency(totalPaidAlready)}
          </Badge>
        )}
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wallet className={`w-5 h-5 ${cashRegister?.status === 'open' ? 'text-success' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">
                {cashRegister ? `Caja abierta — $${Number(cashRegister.opening_balance).toFixed(2)}` : 'Caja cerrada'}
              </p>
              {cashRegister && (
                <p className="text-xs text-muted-foreground">
                  Abierta {new Date(cashRegister.opened_at).toLocaleString('es-DO')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setActiveModule('cash-register')} className="gap-1">
              <Wallet className="w-3 h-3" /> Gestión de Caja
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 pt-0 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> División de Cuenta
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant={splitMode === 'none' ? 'default' : 'outline'} size="sm" onClick={() => { setSplitMode('none'); setSelectedItems({}) }}>
                  Cuenta Completa
                </Button>
                <Button variant={splitMode === 'equal' ? 'default' : 'outline'} size="sm" onClick={() => { setSplitMode('equal'); setSelectedItems({}) }}>
                  Partes Iguales
                </Button>
                <Button variant={splitMode === 'items' ? 'default' : 'outline'} size="sm" onClick={() => setSplitMode('items')}>
                  Por Ítems
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {splitMode === 'equal' && (
                  <motion.div key="equal" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-secondary/30 rounded-lg overflow-hidden">
                    <span className="text-sm shrink-0">Número de partes:</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setNumSplits(Math.max(2, numSplits - 1))}>-</Button>
                      <span className="font-bold font-number w-6 text-center">{numSplits}</span>
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setNumSplits(numSplits + 1)}>+</Button>
                    </div>
                    <span className="text-sm font-semibold sm:ml-auto text-primary">
                      Monto por persona: {formatCurrency((fullOrderSubtotal * 1.28) / numSplits)}
                    </span>
                  </motion.div>
                )}

                {splitMode === 'items' && order && (
                  <motion.div key="items" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-secondary/10 overflow-hidden">
                    <span className="text-xs text-muted-foreground block mb-2">Selecciona la cantidad a pagar de cada producto en este abono:</span>
                    {order.items.map((item) => {
                      const maxQty = Math.max(0, item.quantity - (paidItemsQuantities[item.id] || 0))
                      const selected = selectedItems[item.id] || 0
                      return (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.price)} c/u (Restan: {maxQty} de {item.quantity})
                            </span>
                          </div>
                          {maxQty === 0 ? (
                            <span className="text-xs font-semibold text-success">Totalmente pagado</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="w-7 h-7" disabled={selected <= 0} onClick={() => handleItemQtyChange(item.id, selected - 1, maxQty)}>-</Button>
                              <span className="font-bold w-6 text-center">{selected}</span>
                              <Button variant="outline" size="icon" className="w-7 h-7" disabled={selected >= maxQty} onClick={() => handleItemQtyChange(item.id, selected + 1, maxQty)}>+</Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 pt-0 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-accent" /> Descuentos y Cortesías
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant={discountType === 'none' ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('none'); setDeductFromPayroll(false) }}>
                  Ninguno
                </Button>
                <Button variant={discountType === 'employee' ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('employee'); setDeductFromPayroll(true) }}>
                  Consumo Empleado (50%)
                </Button>
                <Button variant={discountType === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => { setDiscountType('custom'); setDeductFromPayroll(false) }}>
                  Otro %
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {discountType === 'employee' && (
                  <motion.div key="employee" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 p-3 bg-secondary/30 rounded-lg overflow-hidden">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Seleccionar Empleado</label>
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full h-10 rounded-lg bg-background border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">-- Seleccionar --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 font-medium">
                      <input
                        type="checkbox"
                        checked={deductFromPayroll}
                        onChange={(e) => setDeductFromPayroll(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
                      />
                      Deducir de nómina del empleado
                    </label>
                  </motion.div>
                )}

                {discountType === 'custom' && (
                  <motion.div key="custom" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-secondary/30 rounded-lg overflow-hidden">
                    <span className="text-sm shrink-0">Porcentaje de descuento:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customDiscountPct}
                        onChange={(e) => setCustomDiscountPct(e.target.value)}
                        className="w-20 h-10 rounded-lg bg-background border border-border text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="font-bold">%</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {!deductFromPayroll && (
            <Card>
              <CardContent className="p-6 pt-0 space-y-4">
                <h3 className="font-semibold text-sm">Método de pago</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'cash' as const, label: 'Efectivo', icon: DollarSign, desc: 'RD$ / US$' },
                    { id: 'cardnet' as const, label: 'CardNET', icon: CreditCard, desc: 'Tarjeta' },
                    { id: 'tpago' as const, label: 'tPago', icon: Smartphone, desc: 'Transferencia' },
                    { id: 'mixed' as const, label: 'Mixto', icon: CreditCard, desc: 'Efectivo+Tarj' },
                  ].map((pm) => {
                    const Icon = pm.icon
                    const isSelected = method === pm.id
                    return (
                      <Card key={pm.id} className={cn('cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5', isSelected && 'ring-2 ring-primary bg-primary/5')}
                        onClick={() => setMethod(pm.id)}>
                        <CardContent className="p-6 pt-0 text-center flex flex-col items-center">
                          <Icon className="w-6 h-6 mb-1 text-primary" />
                          <p className="text-xs font-semibold">{pm.label}</p>
                          <p className="text-[9px] text-muted-foreground">{pm.desc}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <AnimatePresence>
                  {method === 'cash' && (
                    <motion.div key="cash-input" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden">
                      <label className="text-xs text-muted-foreground">Efectivo recibido</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input type="number" inputMode="decimal" step="0.01" min="0"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="0.00"
                            className="w-full h-12 pl-10 pr-3 rounded-lg bg-input border border-border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 h-12 px-4"
                          onClick={() => setCashReceived(total.toFixed(2))}>
                          Exacto
                        </Button>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 text-xs font-semibold hover:bg-[var(--caribe)] hover:text-white hover:border-transparent transition-colors" onClick={() => setCashReceived('500')}>$500</Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs font-semibold hover:bg-[var(--caribe)] hover:text-white hover:border-transparent transition-colors" onClick={() => setCashReceived('1000')}>$1000</Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs font-semibold hover:bg-[var(--caribe)] hover:text-white hover:border-transparent transition-colors" onClick={() => setCashReceived('2000')}>$2000</Button>
                      </div>
                      {cashReceivedNum > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex justify-between text-sm px-1">
                          <span className="text-muted-foreground">Vuelto</span>
                          <span className={cn('font-bold', change >= 0 ? 'text-success' : 'text-destructive')}>
                            {formatCurrency(Math.abs(change))}
                            {change < 0 && ' (falta)'}
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          {deductFromPayroll && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-primary/10 rounded-xl flex items-center gap-3 text-primary text-sm font-medium border border-primary/20">
              <UserCheck className="w-5 h-5 text-primary shrink-0" />
              <span>El consumo será cargado como una deducción de nómina para <strong>{users.find(u => u.id === selectedEmployeeId)?.username || 'el empleado seleccionado'}</strong>.</span>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 pt-0 space-y-4">
              <h3 className="font-semibold text-sm">Resumen de Cuenta</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {order?.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground truncate mr-2">{item.quantity}x {item.name}</span>
                    <span className="shrink-0 font-number font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator />

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Monto Base Seleccionado</span>
                  <span className="font-number">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between text-destructive font-semibold">
                    <span>Descuento Aplicado</span>
                    <span className="font-number">-{formatCurrency(discountAmt)}</span>
                  </motion.div>
                )}
                <div className="flex justify-between">
                  <span>Subtotal Neto</span>
                  <span className="font-number">{formatCurrency(finalSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ITBIS (18%)</span>
                  <span className="font-number">{formatCurrency(itbis)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Propina Legal (10%)</span>
                  <span className="font-number">{formatCurrency(propina)}</span>
                </div>
              </div>

              <Separator />
              <div className="flex justify-between font-bold text-xl font-heading text-primary">
                <span>Total a Cobrar</span>
                <span className="font-number">{formatCurrency(total)}</span>
              </div>

              <Button
                size="xl"
                className="w-full text-base gap-2 rounded-xl mt-2 transition-all duration-150 hover:brightness-110"
                onClick={handlePayClick}
                disabled={processing || (!deductFromPayroll && (!method || !isValidCash)) || (discountType === 'employee' && !selectedEmployeeId)}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {processing ? 'Procesando...' : (deductFromPayroll ? 'Descontar de Nómina' : `Cobrar ${formatCurrency(total)}`)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PinAuthModal
        open={pinAuthOpen}
        onClose={() => setPinAuthOpen(false)}
        onAuthorized={pinAction}
        title="Verificación de Administrador"
        description="Se requiere el PIN de un administrador para aprobar descuentos y/o consumos especiales de personal."
      />
    </motion.div>
  )
}

function DoneScreen({ paymentId, onDone }: { paymentId: string | null; onDone: () => void }) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(true)
  const [printStatus, setPrintStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paymentId) {
      api(`/billing/payments/${paymentId}/print_receipt/`)
        .then((res: any) => setReceipt(res))
        .catch(() => {})
        .finally(() => setLoadingReceipt(false))
    }
  }, [paymentId])

  const handlePrint = async () => {
    if (!paymentId) return
    setPrintStatus('sending')
    try {
      await api(`/billing/payments/${paymentId}/print_hardware/`, { method: 'POST' })
      setPrintStatus('sent')
    } catch {
      setPrintStatus('failed')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-sm rounded-2xl border-border shadow-xl">
        <CardContent className="p-8 text-center space-y-4 flex flex-col items-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-2 animate-bounce" />
          </motion.div>
          <h2 className="text-xl font-bold mb-1 font-heading">Pago completado</h2>
          <p className="text-sm text-muted-foreground">Gracias por su visita</p>

          <div className="w-full text-left border rounded-xl p-4 bg-background/50 max-h-80 overflow-y-auto">
            {loadingReceipt ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando recibo...</p>
            ) : receipt ? (
              <Receipt ref={receiptRef} data={receipt} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No se pudo cargar el recibo</p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4 w-full">
            <Button onClick={handlePrint} disabled={printStatus === 'sending' || loadingReceipt} className="w-full gap-2 rounded-xl">
              {printStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printStatus === 'sending' ? 'Enviando a impresora...' : printStatus === 'sent' ? '✓ Enviado a impresora' : 'Imprimir recibo (térmica)'}
            </Button>
            <Button onClick={onDone} variant="outline" className="w-full gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Volver al plano
            </Button>
          </div>

          {printStatus === 'failed' && (
            <p className="text-xs text-destructive">No se pudo enviar a la impresora. Verifica el puente AURON.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
