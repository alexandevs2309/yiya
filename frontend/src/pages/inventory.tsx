import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InputField } from '@/components/ui/input-field'
import { Modal } from '@/components/ui/modal'
import { inventory } from '@/services/api'
import { formatCurrency, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Truck, Plus, RefreshCw, Pencil, Trash2, Loader2,
  AlertTriangle, Search, AlertCircle,
} from 'lucide-react'
import { CardSkeleton } from '@/components/ui/skeleton'
import type { InventoryItem, PurchaseOrder } from '@/types'

const categories = ['Todos', 'Carnes', 'Verduras', 'Lácteos', 'Bebidas', 'Panadería', 'Limpieza', 'Otros']
const units = ['unidad', 'kg', 'lb', 'g', 'L', 'ml', 'caja', 'paquete']

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <CardSkeleton className="h-5 flex-1" />
          <CardSkeleton className="h-5 w-20" />
          <CardSkeleton className="h-5 w-16" />
          <CardSkeleton className="h-5 w-16" />
          <CardSkeleton className="h-5 w-20" />
          <CardSkeleton className="h-5 w-24" />
          <CardSkeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

function ItemsTab() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Otros', unit: 'unidad', stock: '0', min_stock: '0', cost_per_unit: '0' })

  const fetch = async () => {
    setLoading(true)
    setError(false)
    const data = await inventory.items.list().catch(() => { setError(true); return [] })
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const filtered = items.filter((i) => {
    if (category !== 'Todos' && i.category !== category) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openCreate = () => {
    setForm({ name: '', category: 'Otros', unit: 'unidad', stock: '0', min_stock: '0', cost_per_unit: '0' })
    setCreating(true)
  }

  const openEdit = (item: InventoryItem) => {
    setForm({ name: item.name, category: item.category, unit: item.unit, stock: String(item.stock), min_stock: String(item.min_stock), cost_per_unit: String(item.cost_per_unit) })
    setEditItem(item)
  }

  const save = async () => {
    const payload = { name: form.name, category: form.category, unit: form.unit, stock: parseFloat(form.stock), min_stock: parseFloat(form.min_stock), cost_per_unit: parseFloat(form.cost_per_unit) }
    if (editItem) {
      await inventory.items.update(editItem.id, payload)
    } else {
      await inventory.items.create(payload)
    }
    setEditItem(null); setCreating(false)
    await fetch()
  }

  const remove = async (item: InventoryItem) => {
    if (!confirm(`¿Eliminar ${item.name}?`)) return
    await inventory.items.remove(item.id)
    await fetch()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <AlertCircle className="w-10 h-10 text-destructive/50 mb-3" />
        <p className="text-sm font-medium">Error al cargar items</p>
        <Button size="sm" variant="outline" onClick={fetch} className="gap-1 mt-3">
          <RefreshCw className="w-3 h-3" /> Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">Items de Inventario</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nuevo</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <Badge key={c} variant={category === c ? 'default' : 'outline'} className="cursor-pointer transition-all" onClick={() => setCategory(c)}>{c}</Badge>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg bg-input border border-border text-sm pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar item..." />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">Categoría</th>
                  <th className="text-left p-3 font-medium">Stock</th>
                  <th className="text-left p-3 font-medium">Stock Mín.</th>
                  <th className="text-left p-3 font-medium">Costo/Unit</th>
                  <th className="text-left p-3 font-medium">Valor Total</th>
                  <th className="text-right p-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const stockPct = item.min_stock > 0 ? Math.min(100, (item.stock / item.min_stock) * 100) : 100
                  const isLow = stockPct <= 100
                  return (
                    <motion.tr key={item.id} layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', item.is_low && 'bg-destructive/5')}>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3"><Badge variant="secondary" className="text-[9px]">{item.category}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(item.is_low && 'text-destructive font-semibold flex items-center gap-1')}>
                            {item.is_low && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            {item.stock} {item.unit}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-500', stockPct <= 50 ? 'bg-[var(--coral)]' : 'bg-[var(--samana)]')}
                              style={{ width: `${Math.min(100, stockPct)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{item.min_stock} {item.unit}</td>
                      <td className="p-3">{formatCurrency(item.cost_per_unit)}</td>
                      <td className="p-3 font-mono text-xs">{formatCurrency(item.total_value)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(item)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    Sin items de inventario
                    <br /><Button variant="link" size="sm" className="mt-1" onClick={openCreate}>Crear primer item</Button>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={creating || !!editItem} onClose={() => { setCreating(false); setEditItem(null) }}
        title={editItem ? 'Editar Item' : 'Nuevo Item'}>
        <div className="space-y-3">
          <InputField label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                {categories.filter(c => c !== 'Todos').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unidad</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <InputField label="Stock" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
            <InputField label="Stock Mín." type="number" value={form.min_stock} onChange={(v) => setForm({ ...form, min_stock: v })} />
            <InputField label="Costo/Unit" type="number" value={form.cost_per_unit} onChange={(v) => setForm({ ...form, cost_per_unit: v })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreating(false); setEditItem(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PurchaseOrdersTab() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ supplier: '', notes: '' })

  const fetch = async () => {
    setLoading(true)
    setError(false)
    const data = await inventory.purchaseOrders.list().catch(() => { setError(true); return [] })
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setForm({ supplier: '', notes: '' })
    setCreating(true)
  }

  const openEdit = (o: PurchaseOrder) => {
    setForm({ supplier: o.supplier, notes: o.notes })
    setEditOrder(o)
  }

  const save = async () => {
    if (editOrder) {
      await inventory.purchaseOrders.update(editOrder.id, { ...form, status: editOrder.status })
    } else {
      await inventory.purchaseOrders.create({ ...form, status: 'pending' })
    }
    setEditOrder(null); setCreating(false)
    await fetch()
  }

  const updateStatus = async (id: string, status: string) => {
    await inventory.purchaseOrders.update(id, { status: status as PurchaseOrder['status'] })
    await fetch()
  }

  const remove = async (o: PurchaseOrder) => {
    if (!confirm(`¿Anular orden ${o.id.slice(0, 8)}?`)) return
    await inventory.purchaseOrders.remove(o.id)
    await fetch()
  }

  const statusColors: Record<string, string> = { pending: 'secondary', partial: 'default', completed: 'default', cancelled: 'destructive' }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <AlertCircle className="w-10 h-10 text-destructive/50 mb-3" />
        <p className="text-sm font-medium">Error al cargar órdenes de compra</p>
        <Button size="sm" variant="outline" onClick={fetch} className="gap-1 mt-3">
          <RefreshCw className="w-3 h-3" /> Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Órdenes de Compra</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nueva</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={4} /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Proveedor</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Notas</th>
                  <th className="text-left p-3 font-medium">Creada</th>
                  <th className="text-right p-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">PO-{o.id.slice(0, 8)}</td>
                    <td className="p-3">{o.supplier || '—'}</td>
                    <td className="p-3">
                      <Badge variant={(statusColors[o.status] || 'outline') as any} className="text-xs">{o.status}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs truncate max-w-[200px]">{o.notes || '—'}</td>
                    <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString('es-DO')}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => updateStatus(o.id, 'completed')}>Completar</Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(o)}><Pencil className="w-3 h-3" /></Button>
                          </>
                        )}
                        {(o.status === 'pending' || o.status === 'partial') && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(o)}><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {orders.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground text-sm">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                    Sin órdenes de compra
                    <br /><Button variant="link" size="sm" className="mt-1" onClick={openCreate}>Crear primera orden</Button>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={creating || !!editOrder} onClose={() => { setCreating(false); setEditOrder(null) }}
        title={editOrder ? 'Editar Orden' : 'Nueva Orden de Compra'}>
        <div className="space-y-3">
          <InputField label="Proveedor" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full h-24 rounded-lg bg-input border border-border text-sm p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreating(false); setEditOrder(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editOrder ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function InventoryPage() {
  const [tab, setTab] = useState<'items' | 'orders'>('items')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'items' ? 'default' : 'outline'} size="sm" onClick={() => setTab('items')} className="gap-1">
          <Package className="w-3 h-3" /> Items
        </Button>
        <Button variant={tab === 'orders' ? 'default' : 'outline'} size="sm" onClick={() => setTab('orders')} className="gap-1">
          <Truck className="w-3 h-3" /> Órdenes de Compra
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
          {tab === 'items' ? <ItemsTab /> : <PurchaseOrdersTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
