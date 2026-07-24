export type UserRole = 'admin' | 'cashier' | 'waiter' | 'cook'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone: string
  avatar?: string
  is_active?: boolean
}

export interface Table {
  id: number
  number: string
  section: string
  capacity: number
  status: 'available' | 'occupied' | 'bill' | 'reserved'
  token?: string
  x?: number
  y?: number
}

export interface MenuItem {
  id: number
  name: string
  category: number
  category_name: string
  price: number
  price_today?: number | null
  effective_price?: number | null
  itbis_type: 'gravado' | 'exento' | 'reducido'
  preparation_time: number
  is_available: boolean
  has_modifiers: boolean
  modifier_groups: ModifierGroup[]
  image?: string
}

export interface ModifierGroup {
  id: number
  name: string
  is_required: boolean
  max_selections: number
  options: ModifierOption[]
}

export interface ModifierOption {
  id: number
  name: string
  price_adjustment: number
}

export interface Order {
  id: string
  table: number | null
  table_number: string | null
  waiter: number
  waiter_name: string
  status: 'open' | 'in_kitchen' | 'ready' | 'paid' | 'cancelled'
  order_type: 'dine-in' | 'takeaway' | 'delivery'
  delivery_address: string
  delivery_fee: number
  customer_phone: string
  guests: number
  notes: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  menu_item: number | null
  name: string
  quantity: number
  price: number
  seat: number
  status: 'pending' | 'in_kitchen' | 'ready' | 'served' | 'cancelled'
  modifiers_json: { name: string; price_adjustment: number }[]
  category_name?: string
  preparation_time?: number
}

export interface MenuCategory {
  id: number
  name: string
  order: number
  items: MenuItem[]
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  stock: number
  min_stock: number
  cost_per_unit: number
  is_low: boolean
  total_value: number
}

export interface PurchaseOrder {
  id: string
  supplier: string
  status: 'pending' | 'partial' | 'completed' | 'cancelled'
  notes: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  rnc: string
  business_name: string
  commercial_name: string
  phone: string
  email: string
  address: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order: string
  method: 'cash' | 'cardnet' | 'tpago' | 'mixed'
  subtotal: number
  itbis: number
  propina: number
  total: number
  cash_received: number | null
  change_given: number | null
  created_at: string
}
