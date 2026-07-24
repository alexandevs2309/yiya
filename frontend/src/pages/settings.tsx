import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi, tables as tablesApi, api, menu, type AuditLogEntry } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Utensils, Table2, FileText, History, Plus, Trash2,
  Shield, UserCircle, Loader2, RefreshCw, QrCode, Server, Pencil, X, Check, Printer, Building2,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/input-field'
import { CardSkeleton } from '@/components/ui/skeleton'
import { toast } from '@/stores/toast-store'
import type { User, Table, MenuItem, MenuCategory, UserRole } from '@/types'

type Tab = 'users' | 'menu' | 'tables' | 'ncf' | 'audit' | 'employees' | 'printers' | 'business' | 'sistema'

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')
  const currentUser = useAppStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'menu', label: 'Menú', icon: Utensils },
    { id: 'tables', label: 'Mesas', icon: Table2 },
    { id: 'employees', label: 'Nómina y Asistencia', icon: UserCircle },
    { id: 'ncf', label: 'NCF', icon: FileText },
    { id: 'audit', label: 'Auditoría', icon: History },
    { id: 'printers', label: 'Impresoras', icon: Printer },
    { id: 'business', label: 'Empresa', icon: Building2 },
    { id: 'sistema', label: 'Sistema', icon: Server },
  ]

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Solo administradores</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row h-full">
      {/* Mobile: select dropdown */}
      <div className="sm:hidden p-2 border-b shrink-0">
        <select value={tab} onChange={(e) => setTab(e.target.value as Tab)}
          className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
          {tabs.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      {/* Desktop: sidebar */}
      <div className="hidden sm:flex sm:flex-col border-r p-2 gap-1 shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <Button key={t.id} variant={tab === t.id ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2 text-sm"
              onClick={() => setTab(t.id)}>
              <Icon className="w-4 h-4" /> {t.label}
            </Button>
          )
        })}
      </div>
      <div className="flex-1 p-3 sm:p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.12 }}>
            {tab === 'users' && <UsersTab />}
            {tab === 'menu' && <MenuTab />}
            {tab === 'tables' && <TablesTab />}
            {tab === 'employees' && <EmployeesTab />}
            {tab === 'ncf' && <NCFTab />}
            {tab === 'audit' && <AuditTab />}
            {tab === 'printers' && <PrinterTab />}
            {tab === 'business' && <BusinessTab />}
            {tab === 'sistema' && <SistemaTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'waiter' as string, phone: '', pin: '' })

  const fetch = async () => {
    setLoading(true)
    const data = await adminApi.users.list().catch(() => [])
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setForm({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'waiter', phone: '', pin: '' })
    setCreating(true)
  }

  const openEdit = (u: User) => {
    setForm({ username: u.username, password: '', first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role, phone: u.phone, pin: '' })
    setEditUser(u)
  }

  const save = async () => {
    if (editUser) {
      const payload: any = { first_name: form.first_name, last_name: form.last_name, email: form.email, role: form.role, phone: form.phone }
      if (form.password) payload.password = form.password
      await adminApi.users.update(editUser.id, payload)
    } else {
      await adminApi.users.create({ ...form, role: form.role as UserRole, is_active: true })
    }
    setEditUser(null)
    setCreating(false)
    await fetch()
  }

  const remove = async (u: User) => {
    if (!confirm(`¿Eliminar usuario ${u.username}?`)) return
    await adminApi.users.remove(u.id)
    await fetch()
  }

  const roleColors: Record<string, string> = { admin: 'destructive', cashier: 'default', waiter: 'secondary', cook: 'outline' }

  if (loading) return <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-12" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Usuarios</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nuevo</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium">Usuario</th>
                <th className="text-left p-3 font-medium">Rol</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-right p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">{u.first_name} {u.last_name}</td>
                  <td className="p-3 font-mono text-xs">{u.username}</td>
                  <td className="p-3"><Badge variant={roleColors[u.role] as any} className="text-xs">{u.role}</Badge></td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3"><Badge variant={u.is_active !== false ? 'default' : 'secondary'} className="text-xs">{u.is_active !== false ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(u)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(u)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal open={creating || !!editUser} onClose={() => { setCreating(false); setEditUser(null) }}
        title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nombre" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
            <InputField label="Apellido" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
          </div>
          <InputField label="Usuario" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <InputField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <InputField label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="admin">Administrador</option>
              <option value="cashier">Cajero</option>
              <option value="waiter">Mesero</option>
              <option value="cook">Cocinero</option>
            </select>
          </div>
          {form.role === 'waiter' && (
            <InputField label="PIN (4-6 dígitos)" value={form.pin} onChange={(v) => setForm({ ...form, pin: v })} />
          )}
          <InputField label={editUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreating(false); setEditUser(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editUser ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MenuTab() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [creatingItem, setCreatingItem] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [itemForm, setItemForm] = useState({ name: '', price: '', price_today: '', itbis_type: 'gravado', is_available: true, preparation_time: '10', category: '', image_file: null as File | null })

  // Recetas
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [addingIngredientId, setAddingIngredientId] = useState<string>('')
  const [addingIngredientQty, setAddingIngredientQty] = useState('0')

  const fetch = async () => {
    setLoading(true)
    const data = await adminApi.menuCategories.list().catch(() => [])
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => { 
    fetch() 
    api('/inventory/items/').then((data: any) => {
      setInventoryItems(data || [])
    }).catch(() => {})
  }, [])

  const addCategory = async () => {
    if (!newCatName.trim()) return
    await adminApi.menuCategories.create({ name: newCatName.trim(), order: categories.length + 1 })
    setNewCatName('')
    await fetch()
  }

  const removeCategory = async (id: number) => {
    if (!confirm('¿Eliminar categoría y todos sus items?')) return
    await adminApi.menuCategories.remove(id)
    await fetch()
  }

  const openCreateItem = (catId: number) => {
    setItemForm({ name: '', price: '', price_today: '', itbis_type: 'gravado', is_available: true, preparation_time: '10', category: String(catId), image_file: null })
    setCreatingItem(true)
    setRecipeIngredients([])
  }

  const openEditItem = async (item: MenuItem) => {
    setItemForm({
      name: item.name,
      price: String(item.price),
      price_today: item.price_today ? String(item.price_today) : '',
      itbis_type: item.itbis_type,
      is_available: item.is_available,
      preparation_time: String(item.preparation_time),
      category: String(item.category),
      image_file: null,
    })
    setEditItem(item)
    try {
      const data: any = await api(`/inventory/recipes/?menu_item=${item.id}`)
      setRecipeIngredients(data || [])
    } catch {
      setRecipeIngredients([])
    }
  }

  const addRecipeIngredient = async () => {
    if (!editItem || !addingIngredientId || parseFloat(addingIngredientQty) <= 0) return
    try {
      await api('/inventory/recipes/', {
        method: 'POST',
        body: JSON.stringify({
          menu_item: editItem.id,
          inventory_item: addingIngredientId,
          quantity: parseFloat(addingIngredientQty)
        })
      })
      const data: any = await api(`/inventory/recipes/?menu_item=${editItem.id}`)
      setRecipeIngredients(data || [])
      setAddingIngredientId('')
      setAddingIngredientQty('0')
    } catch (err) {
      alert('Error al agregar ingrediente a la receta')
    }
  }

  const removeRecipeIngredient = async (recipeId: string) => {
    if (!editItem) return
    try {
      await api(`/inventory/recipes/${recipeId}/`, { method: 'DELETE' })
      setRecipeIngredients(prev => prev.filter(r => r.id !== recipeId))
    } catch {
      alert('Error al eliminar ingrediente de la receta')
    }
  }

  const saveItem = async () => {
    const payload = {
      name: itemForm.name,
      price: parseFloat(itemForm.price),
      price_today: itemForm.price_today ? parseFloat(itemForm.price_today) : null,
      itbis_type: itemForm.itbis_type as MenuItem['itbis_type'],
      is_available: itemForm.is_available,
      preparation_time: parseInt(itemForm.preparation_time),
      category: parseInt(itemForm.category)
    }
    let savedItem: MenuItem
    if (editItem) {
      savedItem = await adminApi.menuItems.update(editItem.id, payload)
    } else {
      savedItem = await adminApi.menuItems.create(payload)
    }
    if (itemForm.image_file) {
      await menu.uploadImage(savedItem.id, itemForm.image_file)
    }
    setEditItem(null)
    setCreatingItem(false)
    await fetch()
  }

  const removeItem = async (id: number) => {
    if (!confirm('¿Eliminar item del menú?')) return
    await adminApi.menuItems.remove(id)
    await fetch()
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-32" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Menú</h3>
        <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Nueva categoría</label>
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ej: Entradas, Pescados..." />
        </div>
        <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()} className="gap-1 mb-0">
          <Plus className="w-3 h-3" /> Agregar
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{cat.name}</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => openCreateItem(cat.id)}>
                  <Plus className="w-3 h-3" /> Item
                </Button>
                <Button size="sm" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => removeCategory(cat.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs font-sans">
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-left p-2 font-medium">Precio Base</th>
                    <th className="text-left p-2 font-medium">Precio Hoy</th>
                    <th className="text-left p-2 font-medium">ITBIS</th>
                    <th className="text-left p-2 font-medium">Disponible</th>
                    <th className="text-right p-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 font-medium">{formatCurrency(item.price)}</td>
                      <td className="p-2 font-medium text-dorado-champan-500">{item.price_today ? formatCurrency(item.price_today) : '—'}</td>
                      <td className="p-2"><Badge variant="secondary" className="text-[9px]">{item.itbis_type}</Badge></td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await adminApi.menuItems.update(item.id, { is_available: !item.is_available })
                          await fetch()
                        }}>
                          <Badge variant={item.is_available ? 'default' : 'secondary'} className="text-xs">{item.is_available ? 'Sí' : 'No'}</Badge>
                        </Button>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditItem(item)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={creatingItem || !!editItem} onClose={() => { setCreatingItem(false); setEditItem(null) }}
        title={editItem ? 'Editar Item' : 'Nuevo Item'}>
        <div className="space-y-3">
          <InputField label="Nombre" value={itemForm.name} onChange={(v) => setItemForm({ ...itemForm, name: v })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-sans">Imagen</label>
            <label className="flex items-center gap-2 cursor-pointer h-10 rounded-lg bg-input border border-border px-3 text-sm text-muted-foreground hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" />
              {itemForm.image_file ? itemForm.image_file.name : (editItem?.image ? 'Cambiar imagen' : 'Subir imagen')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0] || null
                setItemForm({ ...itemForm, image_file: file })
              }} />
            </label>
            {(itemForm.image_file || editItem?.image) && (
              <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border">
                <img
                  src={itemForm.image_file ? URL.createObjectURL(itemForm.image_file) : editItem?.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          <InputField label="Precio Base (RD$)" type="number" value={itemForm.price} onChange={(v) => setItemForm({ ...itemForm, price: v })} />
          <InputField label="Precio Hoy (RD$ - Opcional)" type="number" value={itemForm.price_today} onChange={(v) => setItemForm({ ...itemForm, price_today: v })} />
          <InputField label="Tiempo preparación (min)" type="number" value={itemForm.preparation_time} onChange={(v) => setItemForm({ ...itemForm, preparation_time: v })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-sans">Tipo ITBIS</label>
            <select value={itemForm.itbis_type} onChange={(e) => setItemForm({ ...itemForm, itbis_type: e.target.value })}
              className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring font-sans">
              <option value="gravado">Gravado 18%</option>
              <option value="exento">Exento</option>
              <option value="reducido">Tasa Reducida</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
            <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring font-sans">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {editItem && (
            <div className="border-t pt-3 space-y-2 font-sans">
              <label className="text-xs font-semibold text-muted-foreground block font-sans">Receta (Materia Prima / Ingredientes)</label>
              
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recipeIngredients.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin ingredientes asignados.</p>
                ) : (
                  recipeIngredients.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-1.5 bg-secondary/40 rounded border border-border/60 text-xs">
                      <span>{r.inventory_item_name} ({r.quantity} {r.inventory_item_unit})</span>
                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-destructive font-semibold hover:bg-destructive/10" onClick={() => removeRecipeIngredient(r.id)}>
                        Eliminar
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 items-center">
                <select value={addingIngredientId} onChange={(e) => setAddingIngredientId(e.target.value)}
                  className="flex-1 h-9 rounded bg-input border border-border text-xs px-2 focus:outline-none focus:ring-2 focus:ring-ring font-sans">
                  <option value="">-- Seleccionar Insumo --</option>
                  {inventoryItems.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                  ))}
                </select>
                <input type="number" step="0.0001" placeholder="Cant" value={addingIngredientQty} onChange={(e) => setAddingIngredientQty(e.target.value)}
                  className="w-16 h-9 rounded bg-input border border-border text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button size="sm" className="h-9 px-3 rounded text-xs" onClick={addRecipeIngredient}>+</Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreatingItem(false); setEditItem(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={saveItem}>{editItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TablesTab() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [qrTable, setQrTable] = useState<number | null>(null)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ number: '', section: 'Interior', capacity: '4' })

  const fetch = async () => {
    setLoading(true)
    const data = await tablesApi.list().catch(() => [])
    setTables(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setForm({ number: '', section: 'Interior', capacity: '4' })
    setCreating(true)
  }

  const openEdit = (t: Table) => {
    setForm({ number: t.number, section: t.section, capacity: String(t.capacity) })
    setEditTable(t)
  }

  const save = async () => {
    const payload = { number: form.number, section: form.section, capacity: parseInt(form.capacity) }
    if (editTable) {
      await adminApi.tables.update(editTable.id, payload)
    } else {
      await adminApi.tables.create(payload)
    }
    setEditTable(null)
    setCreating(false)
    await fetch()
  }

  const remove = async (t: Table) => {
    if (!confirm(`¿Eliminar mesa ${t.number}?`)) return
    await adminApi.tables.remove(t.id)
    await fetch()
  }

  const statusColors: Record<string, string> = { available: 'default', occupied: 'destructive', bill: 'secondary', reserved: 'outline' }
  const baseUrl = window.location.origin
  const kioskUrl = (token: string) => `${baseUrl}/kiosk?token=${token}`

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="h-12" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mesas</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nueva</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Sección</th>
                <th className="text-left p-3 font-medium">Capacidad</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-left p-3 font-medium">QR</th>
                <th className="text-right p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono">{t.number}</td>
                  <td className="p-3">{t.section}</td>
                  <td className="p-3">{t.capacity} pers.</td>
                  <td className="p-3"><Badge variant={(statusColors[t.status] || 'outline') as any} className="text-xs">{t.status}</Badge></td>
                  <td className="p-3">
                    {t.token && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs"
                        onClick={() => setQrTable(qrTable === t.id ? null : t.id)}>
                        <QrCode className="w-3 h-3" /> QR
                      </Button>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(t)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {qrTable && tables.find(t => t.id === qrTable)?.token && (
        <Card>
          <CardContent className="p-6 pt-0 text-center space-y-3">
            <h4 className="text-sm font-semibold">QR — Mesa {tables.find(t => t.id === qrTable)?.number}</h4>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(kioskUrl(tables.find(t => t.id === qrTable)!.token!))}`}
              alt="QR Code" className="mx-auto rounded-lg" width={200} height={200} />
            <p className="text-xs text-muted-foreground break-all">{kioskUrl(tables.find(t => t.id === qrTable)!.token!)}</p>
          </CardContent>
        </Card>
      )}

      <Modal open={creating || !!editTable} onClose={() => { setCreating(false); setEditTable(null) }}
        title={editTable ? 'Editar Mesa' : 'Nueva Mesa'}>
        <div className="space-y-3">
          <InputField label="Número" value={form.number} onChange={(v) => setForm({ ...form, number: v })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sección</label>
            <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
              className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="Interior">Interior</option>
              <option value="Terraza">Terraza</option>
              <option value="Barra">Barra</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <InputField label="Capacidad" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreating(false); setEditTable(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editTable ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function NCFTab() {
  const [sequences, setSequences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ncf_type: 'B01', prefix: '', valid_from: '', valid_to: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    setLoading(true)
    const data = await api<{ count: number; results: any[] }>('/billing/ncf-sequences/').catch(() => ({ count: 0, results: [] }))
    setSequences(data.results)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setEditId(null)
    setForm({ ncf_type: 'B01', prefix: '', valid_from: '', valid_to: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (s: any) => {
    setEditId(s.id)
    setForm({
      ncf_type: s.ncf_type,
      prefix: s.prefix,
      valid_from: s.valid_from?.slice(0, 10) || '',
      valid_to: s.valid_to?.slice(0, 10) || '',
      is_active: s.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = JSON.stringify(form)
      if (editId) {
        await api(`/billing/ncf-sequences/${editId}/`, { method: 'PUT', body })
      } else {
        await api('/billing/ncf-sequences/', { method: 'POST', body })
      }
      setShowModal(false)
      toast('Secuencia guardada', 'success')
      await fetch()
    } catch (e: any) { toast(e.message || 'Error', 'error') }
    setSaving(false)
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-12" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Secuencias NCF</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nueva</Button>
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Registra las secuencias NCF otorgadas por la DGII para facturación electrónica.</p>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Prefijo</th>
                <th className="text-left p-3 font-medium">Secuencia actual</th>
                <th className="text-left p-3 font-medium">Válido desde</th>
                <th className="text-left p-3 font-medium">Válido hasta</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-right p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{s.ncf_type}</td>
                  <td className="p-3">{s.prefix}</td>
                  <td className="p-3 font-mono">{s.current_sequence}</td>
                  <td className="p-3 text-xs">{new Date(s.valid_from).toLocaleDateString('es-DO')}</td>
                  <td className="p-3 text-xs">{new Date(s.valid_to).toLocaleDateString('es-DO')}</td>
                  <td className="p-3"><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="w-7 h-7">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {sequences.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">No hay secuencias NCF registradas. Agrega una nueva.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Secuencia NCF' : 'Nueva Secuencia NCF'}>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tipo NCF</label>
            <select value={form.ncf_type} onChange={e => setForm(f => ({ ...f, ncf_type: e.target.value }))}
              className="w-full bg-input border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="B01">B01 — Factura de Consumo</option>
              <option value="B02">B02 — Factura de Crédito Fiscal</option>
              <option value="B04">B04 — Nota de Crédito</option>
              <option value="B14">B14 — Comprobante de Proveedor</option>
              <option value="B15">B15 — Comprobante de Gastos Menores</option>
              <option value="B16">B16 — Comprobante de Regímenes Especiales</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Prefijo</label>
            <input type="text" value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
              placeholder="Ej: B0100000001"
              className="w-full bg-input border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Válido desde</label>
              <input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                className="w-full bg-input border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Válido hasta</label>
              <input type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))}
                className="w-full bg-input border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Activo</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.prefix} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    const data = await adminApi.auditLogs().catch(() => [])
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const actionIcons: Record<string, React.ElementType> = { create: Plus, update: RefreshCw, delete: Trash2, login: UserCircle, payment: Loader2 }

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="h-16" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Auditoría</h3>
        <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">Sin registros</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const Icon = actionIcons[log.action] || RefreshCw
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 text-sm hover:bg-muted/30">
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground">{log.user_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString('es-DO')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PrinterTab() {
  const [printers, setPrinters] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editPrinter, setEditPrinter] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', type: 'receipt', connection_type: 'network',
    ip_address: '', port: '9100', vendor_id: '', product_id: '',
    file_path: '', paper_size: '80mm', is_default: false,
  })

  const fetch = async () => {
    setLoading(true)
    const [p, j] = await Promise.all([
      import('@/services/api').then(m => m.printing.printers.list().catch(() => [])),
      import('@/services/api').then(m => m.printing.jobs.list('?limit=20').catch(() => [])),
    ])
    setPrinters(p)
    setJobs(j)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setForm({ name: '', type: 'receipt', connection_type: 'network', ip_address: '', port: '9100', vendor_id: '', product_id: '', file_path: '', paper_size: '80mm', is_default: false })
    setCreating(true)
  }

  const openEdit = (p: any) => {
    setForm({
      name: p.name, type: p.type, connection_type: p.connection_type,
      ip_address: p.ip_address, port: String(p.port), vendor_id: p.vendor_id,
      product_id: p.product_id, file_path: p.file_path, paper_size: p.paper_size,
      is_default: p.is_default,
    })
    setEditPrinter(p)
  }

  const save = async () => {
    const payload = {
      name: form.name, type: form.type, connection_type: form.connection_type,
      ip_address: form.ip_address, port: parseInt(form.port), vendor_id: form.vendor_id,
      product_id: form.product_id, file_path: form.file_path, paper_size: form.paper_size,
      is_default: form.is_default,
    }
    if (editPrinter) {
      await import('@/services/api').then(m => m.printing.printers.update(editPrinter.id, payload as any))
    } else {
      await import('@/services/api').then(m => m.printing.printers.create(payload as any))
    }
    setEditPrinter(null)
    setCreating(false)
    await fetch()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar impresora?')) return
    await import('@/services/api').then(m => m.printing.printers.remove(id))
    await fetch()
  }

  const testPrint = async (id: string) => {
    setTestResult('Enviando prueba...')
    try {
      const res = await import('@/services/api').then(m => m.printing.printers.test(id))
      setTestResult(res.message)
      setTimeout(() => setTestResult(null), 4000)
    } catch {
      setTestResult('Error al enviar prueba')
    }
  }

  const reprint = async (jobId: string) => {
    try {
      await import('@/services/api').then(m => m.printing.jobs.reprint(jobId))
      alert('Reimpresión encolada')
    } catch {
      alert('Error al reimprimir')
    }
  }

  const typeColors: Record<string, string> = { receipt: 'default', kitchen: 'secondary', bar: 'outline', test: 'destructive' }
  const statusColors: Record<string, string> = { pending: 'secondary', printing: 'default', done: 'default', failed: 'destructive' }

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-24" />)}</div>

  return (
    <div className="space-y-6">
      {/* Impresoras */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Impresoras Térmicas</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Recargar</Button>
          <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3 h-3" /> Nueva</Button>
        </div>
      </div>

      {testResult && (
        <div className="text-sm p-3 rounded-lg bg-secondary/40 border border-border text-center">
          {testResult}
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Conexión</th>
                <th className="text-left p-3 font-medium">Dirección</th>
                <th className="text-left p-3 font-medium">Papel</th>
                <th className="text-left p-3 font-medium">Default</th>
                <th className="text-right p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {printers.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-6 text-muted-foreground text-sm">Sin impresoras configuradas</td></tr>
              ) : printers.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3"><Badge variant={typeColors[p.type] as any} className="text-xs">{p.type}</Badge></td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{p.connection_type}</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">
                    {p.connection_type === 'network' ? `${p.ip_address}:${p.port}` : p.connection_type === 'usb' ? `${p.vendor_id}:${p.product_id}` : p.file_path || '—'}
                  </td>
                  <td className="p-3 text-xs">{p.paper_size}</td>
                  <td className="p-3">{p.is_default && <Badge variant="default" className="text-xs">Sí</Badge>}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => testPrint(p.id)}>
                        <Printer className="w-3 h-3" /> Test
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Trabajos recientes */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Trabajos de Impresión Recientes</h4>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Mesa</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Copias</th>
                  <th className="text-left p-3 font-medium">Error</th>
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-right p-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-6 text-muted-foreground text-sm">Sin trabajos recientes</td></tr>
                ) : jobs.map((j) => (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3"><Badge variant={typeColors[j.type] as any} className="text-xs">{j.type}</Badge></td>
                    <td className="p-3">{j.table_number || '—'}</td>
                    <td className="p-3"><Badge variant={(statusColors[j.status] || 'outline') as any} className="text-xs">{j.status}</Badge></td>
                    <td className="p-3">{j.copies}</td>
                    <td className="p-3 text-xs text-destructive max-w-[150px] truncate">{j.error_message || '—'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString('es-DO')}</td>
                    <td className="p-3 text-right">
                      {j.status === 'done' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => reprint(j.id)}>
                          <Printer className="w-3 h-3" /> Reimprimir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Modal open={creating || !!editPrinter} onClose={() => { setCreating(false); setEditPrinter(null) }}
        title={editPrinter ? 'Editar Impresora' : 'Nueva Impresora'}>
        <div className="space-y-3">
          <InputField label="Nombre descriptivo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="receipt">Recibo (Caja)</option>
                <option value="kitchen">Comanda (Cocina)</option>
                <option value="bar">Barra</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conexión</label>
              <select value={form.connection_type} onChange={(e) => setForm({ ...form, connection_type: e.target.value })}
                className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="network">Red (TCP/IP)</option>
                <option value="usb">USB</option>
                <option value="file">Archivo (debug)</option>
              </select>
            </div>
          </div>
          {form.connection_type === 'network' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Dirección IP" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
              <InputField label="Puerto" type="number" value={form.port} onChange={(v) => setForm({ ...form, port: v })} />
            </div>
          )}
          {form.connection_type === 'usb' && (
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Vendor ID (ej. 0x04b8)" value={form.vendor_id} onChange={(v) => setForm({ ...form, vendor_id: v })} />
              <InputField label="Product ID (ej. 0x0202)" value={form.product_id} onChange={(v) => setForm({ ...form, product_id: v })} />
            </div>
          )}
          {form.connection_type === 'file' && (
            <InputField label="Ruta de archivo" value={form.file_path} onChange={(v) => setForm({ ...form, file_path: v })} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ancho de papel</label>
              <select value={form.paper_size} onChange={(e) => setForm({ ...form, paper_size: e.target.value })}
                className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="80mm">80mm</option>
                <option value="58mm">58mm</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="rounded border-border" />
                <span className="text-sm">Impresora por defecto</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreating(false); setEditPrinter(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={save}>{editPrinter ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function BusinessTab() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const { api } = await import('@/services/api')
      const data = await api('/auth/business-config/')
      setConfig(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchConfig() }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const { api } = await import('@/services/api')
      await api('/auth/business-config/', {
        method: 'PUT',
        body: JSON.stringify(config),
      })
      const { toast } = await import('@/stores/toast-store')
      toast('Configuración guardada', 'success')
    } catch {
      const { toast } = await import('@/stores/toast-store')
      toast('Error al guardar', 'error')
    }
    setSaving(false)
  }

  if (loading) return <div className="space-y-3"><CardSkeleton className="h-48" /><CardSkeleton className="h-32" /></div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Información de la Empresa</h3>
      <p className="text-sm text-muted-foreground">Estos datos aparecen en facturas, recibos y comunicaciones con la DGII.</p>

      <Card>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nombre del Restaurante</label>
              <input type="text" value={config?.business_name || ''} onChange={e => setConfig({...config, business_name: e.target.value})}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">RNC</label>
              <input type="text" value={config?.rnc || ''} onChange={e => setConfig({...config, rnc: e.target.value})} maxLength={11}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Dirección</label>
              <input type="text" value={config?.address || ''} onChange={e => setConfig({...config, address: e.target.value})}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Teléfono</label>
              <input type="text" value={config?.phone || ''} onChange={e => setConfig({...config, phone: e.target.value})}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Correo Electrónico</label>
              <input type="email" value={config?.email || ''} onChange={e => setConfig({...config, email: e.target.value})}
                className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SistemaTab() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [taxConfig, setTaxConfig] = useState<{ itbis_rate: number; tip_rate: number; enable_tip: boolean } | null>(null)
  const [taxLoading, setTaxLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    import('@/services/api').then((m) =>
      m.api<{ status: string; database: string; debug: boolean; time: string }>('/auth/health/')
        .then(setHealth)
        .catch(() => {})
        .finally(() => setLoading(false))
    )
    import('@/services/api').then((m) =>
      m.api<{ itbis_rate: number; tip_rate: number; enable_tip: boolean }>('/auth/tax-config/')
        .then(setTaxConfig)
        .catch(() => {})
        .finally(() => setTaxLoading(false))
    )
  }, [])

  const handleSaveTax = async () => {
    if (!taxConfig) return
    setSaving(true)
    try {
      const { api: apiFn } = await import('@/services/api')
      await apiFn('/auth/tax-config/', {
        method: 'PUT',
        body: JSON.stringify(taxConfig),
      })
      const { toast } = await import('@/stores/toast-store')
      toast('Configuración fiscal guardada', 'success')
    } catch {
      const { toast } = await import('@/stores/toast-store')
      toast('Error al guardar', 'error')
    }
    setSaving(false)
  }

  if (loading) return <div className="space-y-3"><CardSkeleton className="h-48" /><CardSkeleton className="h-24" /></div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Sistema</h3>

      <Card>
        <CardContent className="p-6 pt-0 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant={health?.status === 'ok' ? 'default' : 'destructive'}>{health?.status || 'desconocido'}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base de datos</span>
            <Badge variant={health?.database === 'connected' ? 'default' : 'destructive'}>{health?.database || 'error'}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Modo desarrollo</span>
            <Badge variant="secondary">{health?.debug ? 'Sí' : 'No'}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Servidor</span>
            <span className="font-mono text-xs">{window.location.hostname}</span>
          </div>
          {health?.time && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hora del servidor</span>
              <span className="text-xs">{new Date(health.time).toLocaleString('es-DO')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Configuración Fiscal</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          {taxLoading ? (
            <CardSkeleton className="h-24" />
          ) : taxConfig ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">ITBIS (%)</label>
                  <input type="number" step="0.01" min="0" max="100"
                    value={taxConfig.itbis_rate}
                    onChange={e => setTaxConfig({ ...taxConfig, itbis_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Propina Legal (%)</label>
                  <input type="number" step="0.01" min="0" max="100"
                    value={taxConfig.tip_rate}
                    onChange={e => setTaxConfig({ ...taxConfig, tip_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-input border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="enable-tip" checked={taxConfig.enable_tip}
                  onChange={e => setTaxConfig({ ...taxConfig, enable_tip: e.target.checked })}
                  className="rounded border-border" />
                <label htmlFor="enable-tip" className="text-sm">Habilitar Propina Legal</label>
              </div>
              <Button size="sm" onClick={handleSaveTax} disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar configuración fiscal
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Error al cargar configuración fiscal</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Respaldo</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          <p className="text-sm text-muted-foreground">Genera un respaldo completo de la base de datos y archivos multimedia.</p>
          <Button variant="outline" size="sm" onClick={async () => {
            const btn = document.getElementById('backup-btn')
            if (btn) btn.setAttribute('disabled', 'true')
            try {
              const { api } = await import('@/services/api')
              const res: any = await api('/auth/backup/', { method: 'POST' })
              const { toast } = await import('@/stores/toast-store')
              toast(res?.message || 'Backup completado', 'success')
            } catch (e: any) {
              const { toast } = await import('@/stores/toast-store')
              toast(e.message || 'Error al respaldar', 'error')
            }
            if (btn) btn.removeAttribute('disabled')
          }} id="backup-btn" className="gap-2">
            <RefreshCw className="w-3 h-3" /> Generar respaldo ahora
          </Button>
          <p className="text-xs text-muted-foreground">
            Los respaldos se almacenan en <code className="bg-secondary/50 px-1 rounded">backend/backups/</code>.
            Los archivos antiguos se eliminan automáticamente (máx. 7).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


function EmployeesTab() {
  const [shifts, setShifts] = useState<any[]>([])
  const [payrollData, setPayrollData] = useState<any>(null)
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Rango de fechas nómina
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const defaultEnd = today.toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  // PIN de Asistencia
  const [attendancePinOpen, setAttendancePinOpen] = useState(false)
  const [attendanceAction, setAttendanceAction] = useState<'in' | 'out'>('in')

  const fetchShiftsAndHistory = async () => {
    setLoading(true)
    try {
      const sh: any = await api('/auth/shifts/')
      setShifts(sh?.results || [])
      const pay: any = await api('/auth/payroll/')
      setPayrollHistory(pay?.results || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchShiftsAndHistory()
  }, [])

  const handleClockIn = async (pin: string) => {
    try {
      const res: any = await api('/auth/users/clock-in/', {
        method: 'POST',
        body: JSON.stringify({ pin })
      })
      alert(`Entrada registrada para ${res.user} a las ${new Date(res.clock_in).toLocaleTimeString('es-DO')}`)
      fetchShiftsAndHistory()
    } catch (err: any) {
      alert('Error en reloj checador: ' + (err?.detail || 'PIN incorrecto o ya con turno activo'))
    }
  }

  const handleClockOut = async (pin: string) => {
    try {
      const res: any = await api('/auth/users/clock-out/', {
        method: 'POST',
        body: JSON.stringify({ pin })
      })
      alert(`Salida registrada para ${res.user} a las ${new Date(res.clock_out).toLocaleTimeString('es-DO')}`)
      fetchShiftsAndHistory()
    } catch (err: any) {
      alert('Error en reloj checador: ' + (err?.detail || 'PIN incorrecto o sin turno activo'))
    }
  }

  const calculatePayroll = async () => {
    setLoading(true)
    try {
      const data: any = await api(`/auth/users/calculate/?period_start=${startDate}&period_end=${endDate}`)
      setPayrollData(data)
    } catch {
      alert('Error al calcular la nómina')
    } finally {
      setLoading(false)
    }
  }

  const savePayrollPeriod = async () => {
    if (!payrollData || !payrollData.employees) return
    if (!confirm('¿Registrar y cerrar la nómina para este período?')) return
    
    setLoading(true)
    try {
      for (const emp of payrollData.employees) {
        await api('/auth/payroll/', {
          method: 'POST',
          body: JSON.stringify({
            user: emp.user,
            period_start: payrollData.period_start,
            period_end: payrollData.period_end,
            wages_earned: emp.wages_earned,
            commissions_earned: emp.commissions_earned,
            tips_earned: emp.tips_earned,
            deductions: emp.deductions,
            net_pay: emp.net_pay,
            status: 'pending'
          })
        })
      }
      alert('Nómina del período registrada correctamente')
      setPayrollData(null)
      fetchShiftsAndHistory()
    } catch {
      alert('Error al guardar la nómina')
    } finally {
      setLoading(false)
    }
  }

  const payPayroll = async (id: string) => {
    if (!confirm('¿Marcar este pago de nómina como Pagado?')) return
    try {
      await api(`/auth/payroll/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paid' })
      })
      fetchShiftsAndHistory()
    } catch {
      alert('Error al procesar el pago')
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold font-heading">Asistencia y Nóminas</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setAttendanceAction('in'); setAttendancePinOpen(true) }}>
            Fichar Entrada (Clock In)
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setAttendanceAction('out'); setAttendancePinOpen(true) }}>
            Fichar Salida (Clock Out)
          </Button>
        </div>
      </div>

      {/* Reloj Checador Pin Modal */}
      <Modal open={attendancePinOpen} onClose={() => setAttendancePinOpen(false)} title="Reloj de Asistencia">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Ingresa tu PIN de empleado para registrar tu {attendanceAction === 'in' ? 'entrada' : 'salida'}.</p>
          <div className="flex justify-center">
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              id="attendance-pin-input"
              className="h-12 w-32 border text-center text-2xl tracking-widest rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-input font-bold"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value
                  if (attendanceAction === 'in') handleClockIn(val)
                  else handleClockOut(val)
                  setAttendancePinOpen(false)
                }
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Presiona Enter para enviar</p>
        </div>
      </Modal>

      {/* Calculador de Nómina */}
      <Card>
        <CardContent className="p-6 pt-0 space-y-4">
          <h4 className="font-semibold text-sm">Cierre de Período & Reparto de Propinas</h4>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Inicio</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded border border-border bg-secondary/40 text-sm px-3 focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Fin</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded border border-border bg-secondary/40 text-sm px-3 focus:outline-none" />
            </div>
            <Button onClick={calculatePayroll} disabled={loading} className="h-10 px-4 gap-2 text-sm ml-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular Nómina'}
            </Button>
          </div>

          {payrollData && (
            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-lg text-xs">
                <span>Total de Propinas Legales a Repartir: <strong>{formatCurrency(payrollData.total_tips_collected)}</strong></span>
                <span>Horas Totales del Personal: <strong>{payrollData.total_hours.toFixed(1)} hrs</strong></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="p-2">Empleado</th>
                      <th className="p-2">Rol</th>
                      <th className="p-2">Horas</th>
                      <th className="p-2">Salario Base</th>
                      <th className="p-2">Comisiones</th>
                      <th className="p-2">Propinas (10%)</th>
                      <th className="p-2">Consumos (Deduc.)</th>
                      <th className="p-2 font-bold">Neto a Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.employees.map((emp: any) => (
                      <tr key={emp.user} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="p-2 font-medium">{emp.user_name}</td>
                        <td className="p-2">{emp.role}</td>
                        <td className="p-2 font-mono">{emp.hours_worked.toFixed(1)}</td>
                        <td className="p-2 font-mono">{formatCurrency(emp.wages_earned)}</td>
                        <td className="p-2 font-mono">{formatCurrency(emp.commissions_earned)}</td>
                        <td className="p-2 font-mono text-success font-semibold">{formatCurrency(emp.tips_earned)}</td>
                        <td className="p-2 font-mono text-destructive">{formatCurrency(emp.deductions)}</td>
                        <td className="p-2 font-mono font-bold text-primary">{formatCurrency(emp.net_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPayrollData(null)}>Limpiar</Button>
                <Button size="sm" onClick={savePayrollPeriod}>Registrar y Cerrar Nómina</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Nóminas y Pagos */}
      <Card>
        <CardContent className="p-6 pt-0 space-y-3">
          <h4 className="font-semibold text-sm">Nóminas Cerradas / Historial</h4>
          {payrollHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-4 text-center">No hay registros de nóminas cerradas en el historial.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-2">Empleado</th>
                    <th className="p-2">Desde/Hasta</th>
                    <th className="p-2">Base</th>
                    <th className="p-2">Comisiones</th>
                    <th className="p-2">Propina</th>
                    <th className="p-2">Deducciones</th>
                    <th className="p-2 font-bold">Neto</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollHistory.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="p-2 font-medium">{p.user_name}</td>
                      <td className="p-2">{p.period_start} a {p.period_end}</td>
                      <td className="p-2 font-mono">{formatCurrency(parseFloat(p.wages_earned))}</td>
                      <td className="p-2 font-mono">{formatCurrency(parseFloat(p.commissions_earned))}</td>
                      <td className="p-2 font-mono">{formatCurrency(parseFloat(p.tips_earned))}</td>
                      <td className="p-2 font-mono text-destructive">{formatCurrency(parseFloat(p.deductions))}</td>
                      <td className="p-2 font-mono font-bold text-primary">{formatCurrency(parseFloat(p.net_pay))}</td>
                      <td className="p-2">
                        <Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                          {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        {p.status === 'pending' && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-semibold text-success hover:bg-success/15" onClick={() => payPayroll(p.id)}>
                            Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
