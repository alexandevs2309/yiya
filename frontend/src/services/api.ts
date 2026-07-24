const API_BASE = import.meta.env.VITE_API_URL || '/api'

let accessToken: string | null = localStorage.getItem('access_token')

export function setTokens(access: string, refresh: string) {
  accessToken = access
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  accessToken = null
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.access, data.refresh)
    return true
  } catch {
    return false
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dyiya-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addToOfflineQueue(path: string, options: any): Promise<string> {
  const db = await openDB();
  const id = uuidv4();
  const req = { id, path, options: JSON.parse(JSON.stringify(options)), timestamp: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const request = store.add(req);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineQueue(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a: any, b: any) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

let isSyncing = false;
export async function processOfflineQueue() {
  if (isSyncing) return;
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;
  isSyncing = true;
  console.log(`[Offline Sync] Sincronizando ${queue.length} peticiones en cola...`);
  
  for (const req of queue) {
    try {
      await api(req.path, req.options, true);
      await removeFromOfflineQueue(req.id);
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    } catch (err) {
      console.error(`[Offline Sync] Falló sincronización de ${req.path}:`, err);
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('Error de red'))) {
        break;
      }
      // Si es un error de negocio (ej. 400), lo descartamos de la cola
      await removeFromOfflineQueue(req.id);
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
  }
  isSyncing = false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Connection] Conexión recuperada. Sincronizando cola offline...');
    processOfflineQueue();
  });
  setTimeout(processOfflineQueue, 2000);
  setInterval(processOfflineQueue, 30000);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  skipQueue = false,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const method = options.method || 'GET';
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isAuth = path.includes('/auth/');

  // Si estamos desconectados físicamente en el navegador
  if (typeof navigator !== 'undefined' && !navigator.onLine && isWrite && !skipQueue && !isAuth) {
    let bodyObj: any = null;
    if (options.body && typeof options.body === 'string') {
      try { bodyObj = JSON.parse(options.body); } catch {}
    }
    let generatedId = '';
    if (path.includes('/open/') || path.includes('/add_item/')) {
      if (bodyObj && !bodyObj.id) {
        generatedId = uuidv4();
        bodyObj.id = generatedId;
        options.body = JSON.stringify(bodyObj);
      }
    }
    await addToOfflineQueue(path, options);
    window.dispatchEvent(new CustomEvent('offline-queue-changed'));

    if (path.includes('/open/')) {
      return {
        id: generatedId,
        table: parseInt(path.split('/').slice(-3, -2)[0]) || 0,
        status: 'open',
        guests: bodyObj?.guests || 2,
        items: [],
        created_at: new Date().toISOString(),
      } as any;
    }
    if (path.includes('/add_item/')) {
      return {
        id: generatedId,
        menu_item: bodyObj?.menu_item,
        name: bodyObj?.name,
        price: bodyObj?.price,
        quantity: bodyObj?.quantity || 1,
        seat: bodyObj?.seat || 1,
        status: 'pending',
        modifiers_json: bodyObj?.modifiers_json || [],
      } as any;
    }
    return { status: 'queued', id: generatedId } as any;
  }

  const headers: Record<string, string> = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 && accessToken) {
      const refreshed = await refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      } else {
        clearTokens();
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
      let errorText = 'Error de red';
      if (error && typeof error === 'object') {
        if (error.detail) errorText = error.detail;
        else if (error.message) errorText = error.message;
        else if (error.non_field_errors) errorText = error.non_field_errors[0];
        else {
          const values = Object.values(error);
          if (values.length > 0 && Array.isArray(values[0])) {
            errorText = String(values[0][0]);
          } else {
            errorText = JSON.stringify(error);
          }
        }
      }
      const httpError = new Error(errorText);
      (httpError as any).isHttpError = true;
      throw httpError;
    }

    return res.json();
  } catch (err: any) {
    // Si falla por error de red y no se está reintentando, lo encolamos
    if (err.isHttpError) {
      throw err; // No encolar errores de validación o del servidor (400, 500)
    }
    if (isWrite && !skipQueue && !isAuth) {
      console.warn(`[Offline Queue] Fallo de red detectado para ${path}. Guardando en IndexedDB...`);
      let bodyObj: any = null;
      if (options.body && typeof options.body === 'string') {
        try { bodyObj = JSON.parse(options.body); } catch {}
      }
      let generatedId = '';
      if (path.includes('/open/') || path.includes('/add_item/')) {
        if (bodyObj && !bodyObj.id) {
          generatedId = uuidv4();
          bodyObj.id = generatedId;
          options.body = JSON.stringify(bodyObj);
        }
      }
      await addToOfflineQueue(path, options);
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));

      if (path.includes('/open/')) {
        return {
          id: generatedId,
          table: parseInt(path.split('/').slice(-3, -2)[0]) || 0,
          status: 'open',
          guests: bodyObj?.guests || 2,
          items: [],
          created_at: new Date().toISOString(),
        } as any;
      }
      if (path.includes('/add_item/')) {
        return {
          id: generatedId,
          menu_item: bodyObj?.menu_item,
          name: bodyObj?.name,
          price: bodyObj?.price,
          quantity: bodyObj?.quantity || 1,
          seat: bodyObj?.seat || 1,
          status: 'pending',
          modifiers_json: bodyObj?.modifiers_json || [],
        } as any;
      }
      return { status: 'queued', id: generatedId } as any;
    }
    throw err;
  }
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    api<{ access: string; refresh: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  pinLogin: (pin: string) =>
    api<{ access: string; refresh: string; user: import('@/types').User }>('/auth/pin-login/', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  me: () => api<import('@/types').User>('/auth/users/me/'),
}

async function unwrapPaginated<T>(path: string): Promise<T[]> {
  const data = await api<{ count: number; results: T[] }>(path)
  return data.results
}

// Tables
export const tables = {
  list: () => unwrapPaginated<import('@/types').Table>('/pos/tables/'),
  open: (id: number, guests: number) =>
    api<import('@/types').Order>(`/pos/tables/${id}/open/`, {
      method: 'POST',
      body: JSON.stringify({ guests }),
    }),
  takeaway: (guests?: number) =>
    api<import('@/types').Order>('/pos/tables/takeaway/', {
      method: 'POST',
      body: JSON.stringify({ guests: guests || 1 }),
    }),
  close: (id: number) =>
    api<{ status: string }>(`/pos/tables/${id}/close/`, { method: 'POST' }),
  requestBill: (id: number) =>
    api<{ status: string; table_status: string }>(`/pos/tables/${id}/request_bill/`, { method: 'POST' }),
  move: (id: number, x: number, y: number) =>
    api<import('@/types').Table>(`/pos/tables/${id}/move/`, {
      method: 'PATCH',
      body: JSON.stringify({ x, y }),
    }),
}

// Menu
export const menu = {
  list: () => unwrapPaginated<import('@/types').MenuItem>('/pos/menu-items/'),
  categories: () => unwrapPaginated<import('@/types').MenuCategory>('/pos/menu-categories/'),
  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api<import('@/types').MenuItem>(`/pos/menu-items/${id}/upload_image/`, {
      method: 'POST',
      body: form,
      headers: {},
    })
  },
}

// Orders
export const orders = {
  list: (query?: string) => unwrapPaginated<import('@/types').Order>(`/pos/orders/${query || ''}`),
  get: (id: string) => api<import('@/types').Order>(`/pos/orders/${id}/`),
  getActiveByTable: async (tableId: number) => {
    const list = await unwrapPaginated<import('@/types').Order>(`/pos/orders/?table=${tableId}`);
    return list.find(o => o.status !== 'paid' && o.status !== 'cancelled');
  },
  addItem: (orderId: string, item: Partial<import('@/types').OrderItem>) =>
    api<import('@/types').OrderItem>(`/pos/orders/${orderId}/add_item/`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  sendToKitchen: (orderId: string) =>
    api<{ status: string; sent: number }>(`/pos/orders/${orderId}/send_to_kitchen/`, {
      method: 'POST',
    }),
  completeItem: (orderId: string, itemId: string) =>
    api<{ status: string; item_status: string }>(`/pos/orders/${orderId}/complete_item/`, {
      method: 'POST',
      body: JSON.stringify({ item_pk: itemId }),
    }),
  recallItem: (orderId: string, itemId: string) =>
    api<{ status: string; item_status: string }>(`/pos/orders/${orderId}/recall_item/`, {
      method: 'POST',
      body: JSON.stringify({ item_pk: itemId }),
    }),
  mark86: (orderId: string, itemId: string) =>
    api<{ status: string; item_status: string }>(`/pos/orders/${orderId}/mark_86/`, {
      method: 'POST',
      body: JSON.stringify({ item_pk: itemId }),
    }),
  updateItem: (orderId: string, itemId: string, data: { quantity?: number; modifiers_json?: { name: string; price_adjustment: number }[] }) =>
    api<import('@/types').OrderItem>(`/pos/orders/${orderId}/update_item/`, {
      method: 'PATCH',
      body: JSON.stringify({ item_pk: itemId, ...data }),
    }),
  removeItem: (orderId: string, itemId: string) =>
    api<{ status: string }>(`/pos/orders/${orderId}/remove_item/${itemId}/`, {
      method: 'DELETE',
    }),
  printReceipt: (orderId: string) => api<ReceiptData>(`/pos/orders/${orderId}/print_receipt/`),
  printHardware: (orderId: string) => api<{ status: string }>(`/pos/orders/${orderId}/print_hardware/`, { method: 'POST' }),
  callWaiter: (orderId: string, reason?: string) =>
    api<{ status: string; message: string }>(`/pos/orders/${orderId}/call_waiter/`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || '' }),
    }),
  transfer: (orderId: string, newTableId: number) =>
    api<import('@/types').Order>(`/pos/orders/${orderId}/transfer/`, {
      method: 'POST',
      body: JSON.stringify({ table_id: newTableId }),
    }),
}

export interface ReceiptData {
  restaurant: string
  rnc: string
  direccion: string
  ncf: string
  metodo_pago: string
  mesa: string
  mesero: string
  fecha: string
  items: { cantidad: number; nombre: string; precio: number; total: number; modificadores: string[] }[]
  subtotal: number
  itbis: number
  propina: number
  total: number
  efectivo: number | null
  cambio: number | null
}

// Dashboard
export const dashboardApi = {
  get: (startDate?: string, endDate?: string) => {
    let url = '/pos/dashboard/'
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`
    }
    return api<DashboardData>(url)
  },
}

export interface DashboardData {
  ventas_hoy: number
  itbis_hoy: number
  propina_hoy: number
  total_transacciones: number
  ticket_promedio: number
  mesas_ocupadas: number
  mesas_con_cuenta: number
  total_mesas: number
  ordenes_en_cocina: number
  ecf_pendientes: number
  ecf_fallidos: number
  ncf_sequences: { ncf_type: string; current_sequence: number; valid_to: string }[]
  hourly_orders: { hour: number; orders: number }[]
  payment_methods: { efectivo: number; tarjeta: number; transferencia: number; yape: number }
  activity: {
    type: 'order' | 'payment'
    description: string
    table: string
    amount: number | null
    user: string
    time: string
  }[]
  top_items: { name: string; quantity: number }[]
  top_waiters: { name: string; orders: number }[]
}

// Admin
export const adminApi = {
  users: {
    list: () => unwrapPaginated<import('@/types').User>('/auth/users/'),
    create: (data: Partial<import('@/types').User> & { password: string }) =>
      api<import('@/types').User>('/auth/users/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('@/types').User> & { password?: string } | FormData) =>
      api<import('@/types').User>(`/auth/users/${id}/`, { method: 'PATCH', body: data instanceof FormData ? data : JSON.stringify(data) }),
    remove: (id: string) => api<never>(`/auth/users/${id}/`, { method: 'DELETE' }),
  },
  auditLogs: () => unwrapPaginated<AuditLogEntry>('/auth/audit-logs/'),
  menuCategories: {
    list: () => unwrapPaginated<import('@/types').MenuCategory>('/pos/menu-categories/'),
    create: (data: { name: string; order: number }) =>
      api<import('@/types').MenuCategory>('/pos/menu-categories/', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: number) => api<never>(`/pos/menu-categories/${id}/`, { method: 'DELETE' }),
  },
  menuItems: {
    update: (id: number, data: Partial<import('@/types').MenuItem>) =>
      api<import('@/types').MenuItem>(`/pos/menu-items/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    create: (data: Partial<import('@/types').MenuItem>) =>
      api<import('@/types').MenuItem>('/pos/menu-items/', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: number) => api<never>(`/pos/menu-items/${id}/`, { method: 'DELETE' }),
  },
  tables: {
    create: (data: { number: string; section: string; capacity: number }) =>
      api<import('@/types').Table>('/pos/tables/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import('@/types').Table>) =>
      api<import('@/types').Table>(`/pos/tables/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: number) => api<never>(`/pos/tables/${id}/`, { method: 'DELETE' }),
  },
}

// Inventory
export const inventory = {
  items: {
    list: (query?: string) => unwrapPaginated<import('@/types').InventoryItem>(`/inventory/items/${query || ''}`),
    create: (data: Partial<import('@/types').InventoryItem>) =>
      api<import('@/types').InventoryItem>('/inventory/items/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('@/types').InventoryItem>) =>
      api<import('@/types').InventoryItem>(`/inventory/items/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => api<never>(`/inventory/items/${id}/`, { method: 'DELETE' }),
  },
  purchaseOrders: {
    list: (query?: string) => unwrapPaginated<import('@/types').PurchaseOrder>(`/inventory/purchase-orders/${query || ''}`),
    create: (data: Partial<import('@/types').PurchaseOrder>) =>
      api<import('@/types').PurchaseOrder>('/inventory/purchase-orders/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<import('@/types').PurchaseOrder>) =>
      api<import('@/types').PurchaseOrder>(`/inventory/purchase-orders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => api<never>(`/inventory/purchase-orders/${id}/`, { method: 'DELETE' }),
  },
}

// Customers
export const customers = {
  list: (query?: string) => unwrapPaginated<import('@/types').Customer>(`/auth/customers/${query || ''}`),
  create: (data: Partial<import('@/types').Customer>) =>
    api<import('@/types').Customer>('/auth/customers/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<import('@/types').Customer>) =>
    api<import('@/types').Customer>(`/auth/customers/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<never>(`/auth/customers/${id}/`, { method: 'DELETE' }),
}

// Printing
export interface PrinterConfig {
  id: string
  name: string
  type: 'receipt' | 'kitchen' | 'bar'
  connection_type: 'network' | 'usb' | 'file'
  ip_address: string
  port: number
  vendor_id: string
  product_id: string
  file_path: string
  paper_size: '80mm' | '58mm'
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PrintJobData {
  id: string
  type: string
  status: string
  data: any
  printer: string | null
  printer_name: string
  payment: string | null
  order: string | null
  order_number: string
  table_number: string
  copies: number
  retry_count: number
  max_retries: number
  error_message: string
  created_at: string
  printed_at: string | null
}

export const printing = {
  printers: {
    list: () => unwrapPaginated<PrinterConfig>('/printing/printers/'),
    get: (id: string) => api<PrinterConfig>(`/printing/printers/${id}/`),
    create: (data: Partial<PrinterConfig>) =>
      api<PrinterConfig>('/printing/printers/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<PrinterConfig>) =>
      api<PrinterConfig>(`/printing/printers/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => api<never>(`/printing/printers/${id}/`, { method: 'DELETE' }),
    test: (id: string) =>
      api<{ status: string; job_id: string; message: string }>(`/printing/printers/${id}/test/`, { method: 'POST' }),
  },
  jobs: {
    list: (query?: string) => unwrapPaginated<PrintJobData>(`/printing/jobs/${query || ''}`),
    get: (id: string) => api<PrintJobData>(`/printing/jobs/${id}/`),
    reprint: (id: string, copies?: number) =>
      api<PrintJobData>(`/printing/jobs/${id}/reprint/`, {
        method: 'POST',
        body: JSON.stringify({ copies: copies || 1 }),
      }),
    pending: () => api<{ id: string; type: string; data: any; copies: number; printer_id: string | null; created_at: string }[]>('/printing/jobs/pending/'),
  },
}

export interface AuditLogEntry {
  id: string
  user: string | null
  user_name: string
  action: 'create' | 'update' | 'delete' | 'login' | 'payment'
  model_name: string
  object_id: string
  description: string
  created_at: string
}
