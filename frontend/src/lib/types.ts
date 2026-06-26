export type UserRole = "admin" | "waitress" | "cook" | "utility" | "owner" | "manager" | "cashier" | "bartender";

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  pin: string;
  phone: string;
  is_active: boolean;
  session_color: string;
  date_joined: string;
  last_login: string | null;
}

export interface UserPermissions {
  can_void_orders: boolean;
  can_apply_discount: boolean;
  can_view_reports: boolean;
  can_manage_menu: boolean;
  can_open_cashier: boolean;
  can_manage_users: boolean;
  can_view_all_orders: boolean;
  discount_limit: number;
}

export type TableStatus = "free" | "occupied" | "billing";

export interface Table {
  id: string;
  number: number;
  zone: string | null;
  zone_name: string | null;
  capacity: number;
  status: TableStatus;
  opened_at: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  minutes_occupied: number;
  active_order_id: string | null;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface Modifier {
  name: string;
  type: "toggle" | "select" | "text";
  options?: string[];
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price_base: number;
  price_today: number | null;
  effective_price: number;
  image: string | null;
  available_today: boolean;
  is_platillo_dia: boolean;
  modifiers_available: Modifier[];
  active: boolean;
  sort_order: number;
}

export type OrderStatus = "open" | "billing" | "paid" | "void";
export type ItemStatus = "pending" | "preparing" | "ready" | "delivered";
export type PaymentMethod = "cash" | "card" | "transfer" | "mixed";

export interface OrderItem {
  id: string;
  order: string;
  menu_item: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  modifiers: string[];
  notes: string;
  status: ItemStatus;
  prepared_at: string | null;
  total_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  id_short: string;
  table: string;
  table_number: number;
  waitress: string;
  waitress_name: string;
  status: OrderStatus;
  diners: number;
  subtotal: number | null;
  itbis: number | null;
  tip: number | null;
  total: number | null;
  payment_method: PaymentMethod | null;
  amount_received: number | null;
  change: number | null;
  receipt_number: string | null;
  offline_id: string | null;
  rnc?: string | null;
  whatsapp?: string | null;
  ecf_document?: ECFDocument | null;
  synced: boolean;
  sync_attempts?: number;
  items: OrderItem[];
  created_at: string;
  closed_at: string | null;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  modifiers: string[];
  notes: string;
  hasItbis: boolean;
  image?: string | null;
}

export interface PendingOrder {
  offlineId: string;
  tableId: string;
  items: CartItem[];
  createdAt: string;
  synced: boolean;
}

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  opened_by_name: string | null;
  closed_by: string | null;
  closed_by_name: string | null;
  initial_amount: number;
  expected_cash: number | null;
  actual_cash: number | null;
  difference: number | null;
  current_cash?: number;
  status: "open" | "closed";
  notes: string;
}

export type ECFType = "01" | "02" | "04";
export type ECFStatus = "pending" | "approved" | "rejected" | "failed";

export interface ECFDocument {
  id: string;
  order: string;
  ecf_type: ECFType;
  rnc: string;
  ecf_number: string;
  status: ECFStatus;
  provisional_number: string;
  pdf_url: string;
  qr_code: string;
  whatsapp_sent: boolean;
  retries: number;
  created_at: string;
  order_total?: string | number;
  order_subtotal?: string | number;
  order_itbis?: string | number;
  order_tip?: string | number;
  order_payment_method?: string;
  order_amount_received?: string | number;
}

export interface Purchase {
  id: string;
  supplier_rnc: string;
  supplier_name: string;
  date: string;
  ncf: string;
  subtotal: string | number;
  itbis: string | number;
  total: string | number;
  notes: string;
  created_at: string;
}


export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
  permissions: UserPermissions;
  default_route: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type WSEvent =
  | { type: "table_updated"; table: Table }
  | { type: "new_order"; order: Order }
  | { type: "item_ready"; itemId: string; tableNumber: number }
  | { type: "ecf_approved"; orderId: string; ecfNumber: string };
