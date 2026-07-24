import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { api } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Minus, Wallet, Banknote, X, CheckCircle2, History, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from '@/stores/toast-store'

interface CashRegister {
  id: string
  user_name: string
  opened_at: string
  closed_at: string | null
  opening_balance: number
  closing_balance: number | null
  expected_cash: number | null
  actual_cash: number | null
  difference: number | null
  status: 'open' | 'closed'
  notes: string
  movement_count: number
}

interface CashMovement {
  id: string
  type: 'entry' | 'exit' | 'sale'
  amount: number
  reference: string
  description: string
  created_by_name: string
  created_at: string
}

export function CashRegisterPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [openReg, setOpenReg] = useState<CashRegister | null>(null)
  const [selectedReg, setSelectedReg] = useState<CashRegister | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showMovementsModal, setShowMovementsModal] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('0')
  const [actualCash, setActualCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [movType, setMovType] = useState<'entry' | 'exit'>('entry')
  const [movAmount, setMovAmount] = useState('')
  const [movDesc, setMovDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [totalSales, setTotalSales] = useState(0)
  const [netMovement, setNetMovement] = useState(0)

  const fetchRegisters = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ count: number; results: CashRegister[] }>('/cashregister/registers/?page_size=50')
      setRegisters(data.results)
      const open = data.results.find(r => r.status === 'open')
      setOpenReg(open || null)
      if (open) {
        const report = await api<CashRegister & { movements: CashMovement[] }>(`/cashregister/registers/${open.id}/report/`)
        const sales = (report.movements || []).filter(m => m.type === 'sale').reduce((s, m) => s + m.amount, 0)
        const entries = (report.movements || []).filter(m => m.type === 'entry').reduce((s, m) => s + m.amount, 0)
        const exits = (report.movements || []).filter(m => m.type === 'exit').reduce((s, m) => s + m.amount, 0)
        setTotalSales(sales)
        setNetMovement(entries - exits)
      } else {
        setTotalSales(0)
        setNetMovement(0)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRegisters() }, [fetchRegisters])

  // Auto-refresh cada 30s si hay caja abierta
  useEffect(() => {
    if (!openReg) return
    const interval = setInterval(fetchRegisters, 30000)
    return () => clearInterval(interval)
  }, [openReg, fetchRegisters])

  const handleOpen = async () => {
    setSubmitting(true)
    try {
      await api('/cashregister/registers/open/', {
        method: 'POST',
        body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 }),
      })
      setShowOpenModal(false)
      toast('Caja abierta correctamente', 'success')
      await fetchRegisters()
    } catch (e: any) { toast(e.message || 'Error', 'error') }
    setSubmitting(false)
  }

  const handleClose = async () => {
    if (!openReg) return
    setSubmitting(true)
    try {
      await api(`/cashregister/registers/${openReg.id}/close/`, {
        method: 'POST',
        body: JSON.stringify({ actual_cash: parseFloat(actualCash), notes: closeNotes }),
      })
      setShowCloseModal(false)
      setActualCash('')
      setCloseNotes('')
      toast('Caja cerrada correctamente', 'success')
      await fetchRegisters()
    } catch (e: any) { toast(e.message || 'Error', 'error') }
    setSubmitting(false)
  }

  const handleMovement = async () => {
    if (!openReg) return
    setSubmitting(true)
    try {
      await api(`/cashregister/registers/${openReg.id}/add_movement/`, {
        method: 'POST',
        body: JSON.stringify({ type: movType, amount: parseFloat(movAmount), description: movDesc }),
      })
      setShowMovementModal(false)
      setMovAmount('')
      setMovDesc('')
      toast('Movimiento registrado', 'success')
      await fetchRegisters()
    } catch (e: any) { toast(e.message || 'Error', 'error') }
    setSubmitting(false)
  }

  const showMovements = async (reg: CashRegister) => {
    setSelectedReg(reg)
    setMovements([])
    setShowMovementsModal(true)
    try {
      const data = await api<CashRegister & { movements: CashMovement[] }>(`/cashregister/registers/${reg.id}/report/`)
      setMovements(data.movements || [])
    } catch { /* ignore */ }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caja Registradora</h2>
          <p className="text-sm text-muted-foreground">Control de apertura y cierre de caja</p>
        </div>
        <div className="flex gap-2">
          {!openReg ? (
            <Button onClick={() => setShowOpenModal(true)} className="gap-2">
              <Wallet className="w-4 h-4" /> Abrir Caja
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowMovementModal(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Movimiento
              </Button>
              <Button onClick={() => setShowCloseModal(true)} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Cerrar Caja
              </Button>
            </>
          )}
        </div>
      </div>

      {openReg && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Caja abierta</p>
                  <p className="text-xs text-muted-foreground">
                    Abierta el {new Date(openReg.opened_at).toLocaleString('es-DO')} por {openReg.user_name}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background/60 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Fondo inicial</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(openReg.opening_balance)}</p>
              </div>
              <div className="bg-background/60 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Ventas acumuladas</p>
                <p className="text-lg font-bold tabular-nums text-success">{formatCurrency(totalSales)}</p>
              </div>
              <div className="bg-background/60 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Mov. neto</p>
                <p className={`text-lg font-bold tabular-nums ${netMovement >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}
                </p>
              </div>
              <div className="bg-background/60 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Efectivo esperado</p>
                <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(openReg.opening_balance + totalSales + netMovement)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historial de Cierres</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : registers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay registros de caja</p>
              <p className="text-xs">Abre una caja para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Usuario</th>
                    <th className="text-left p-3 font-medium">Apertura</th>
                    <th className="text-left p-3 font-medium">Cierre</th>
                    <th className="text-right p-3 font-medium">F. Inicial</th>
                    <th className="text-right p-3 font-medium">Esperado</th>
                    <th className="text-right p-3 font-medium">Real</th>
                    <th className="text-right p-3 font-medium">Diferencia</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                    <th className="text-right p-3 font-medium">Mov.</th>
                  </tr>
                </thead>
                <tbody>
                  {registers.map((reg, i) => (
                    <motion.tr key={reg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => showMovements(reg)}>
                      <td className="p-3">{reg.user_name}</td>
                      <td className="p-3 text-xs">{new Date(reg.opened_at).toLocaleString('es-DO')}</td>
                      <td className="p-3 text-xs">{reg.closed_at ? new Date(reg.closed_at).toLocaleString('es-DO') : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(reg.opening_balance)}</td>
                      <td className="p-3 text-right tabular-nums">{reg.expected_cash != null ? formatCurrency(reg.expected_cash) : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{reg.actual_cash != null ? formatCurrency(reg.actual_cash) : '—'}</td>
                      <td className="p-3 text-right tabular-nums">
                        {reg.difference != null ? (
                          <span className={reg.difference === 0 ? 'text-success' : reg.difference > 0 ? 'text-warning' : 'text-destructive'}>
                            {formatCurrency(reg.difference)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={reg.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                          {reg.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{reg.movement_count}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title="Abrir Caja">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">Registra el monto inicial en efectivo disponible en la caja.</p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Fondo inicial (RD$)</label>
            <input type="number" step="0.01" min="0" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowOpenModal(false)}>Cancelar</Button>
            <Button onClick={handleOpen} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Abrir Caja
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Cerrar Caja — Arqueo">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">Ingresa el monto real en efectivo para realizar el arqueo.</p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Efectivo real en caja (RD$)</label>
            <input type="number" step="0.01" min="0" value={actualCash} onChange={e => setActualCash(e.target.value)}
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          {openReg && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Fondo inicial</p>
                <p className="font-semibold tabular-nums">{formatCurrency(openReg.opening_balance)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Ventas acumuladas</p>
                <p className="font-semibold tabular-nums text-success">{formatCurrency(totalSales)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Mov. neto</p>
                <p className={`font-semibold tabular-nums ${netMovement >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Efectivo esperado</p>
                <p className="font-semibold tabular-nums text-primary">{formatCurrency(openReg.opening_balance + totalSales + netMovement)}</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Notas (opcional)</label>
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={3}
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={submitting || !actualCash} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Cerrar Caja
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showMovementModal} onClose={() => setShowMovementModal(false)} title="Registrar Movimiento">
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Button variant={movType === 'entry' ? 'default' : 'outline'} onClick={() => setMovType('entry')} className="flex-1 gap-2">
              <Plus className="w-4 h-4" /> Entrada
            </Button>
            <Button variant={movType === 'exit' ? 'destructive' : 'outline'} onClick={() => setMovType('exit')} className="flex-1 gap-2">
              <Minus className="w-4 h-4" /> Salida
            </Button>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Monto (RD$)</label>
            <input type="number" step="0.01" min="0" value={movAmount} onChange={e => setMovAmount(e.target.value)}
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm font-mono mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
            <input type="text" value={movDesc} onChange={e => setMovDesc(e.target.value)}
              placeholder="Ej: Pago a proveedor, retiro de efectivo..."
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowMovementModal(false)}>Cancelar</Button>
            <Button onClick={handleMovement} disabled={submitting || !movAmount} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showMovementsModal} onClose={() => setShowMovementsModal(false)} title={`Movimientos — ${selectedReg?.user_name || ''}`}>
        <div className="space-y-4 pt-4">
          {selectedReg && (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Apertura</p>
                <p className="font-semibold tabular-nums">{formatCurrency(selectedReg.opening_balance)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Esperado</p>
                <p className="font-semibold tabular-nums">{selectedReg.expected_cash != null ? formatCurrency(selectedReg.expected_cash) : '—'}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`font-semibold tabular-nums ${selectedReg.difference === 0 ? 'text-success' : selectedReg.difference != null && selectedReg.difference > 0 ? 'text-warning' : 'text-destructive'}`}>
                  {selectedReg.difference != null ? formatCurrency(selectedReg.difference) : '—'}
                </p>
              </div>
            </div>
          )}
          {movements.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {movements.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center ${m.type === 'entry' || m.type === 'sale' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {m.type === 'entry' || m.type === 'sale' ? <Plus className="w-4 h-4 text-success" /> : <Minus className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.description || { entry: 'Entrada', exit: 'Salida', sale: 'Venta' }[m.type]}</p>
                      <p className="text-xs text-muted-foreground">{m.created_by_name} · {new Date(m.created_at).toLocaleString('es-DO')}</p>
                    </div>
                  </div>
                  <p className={`font-semibold tabular-nums ${m.type === 'entry' || m.type === 'sale' ? 'text-success' : 'text-destructive'}`}>
                    {(m.type === 'entry' || m.type === 'sale' ? '+' : '-')}{formatCurrency(m.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  )
}
