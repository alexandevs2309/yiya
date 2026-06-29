import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Search, X } from "lucide-react";
import { purchasesService } from "@/services/purchases.service";
import { formatRD } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface PurchaseOrder {
  id: string;
  supplier: string;
  status: "pending" | "received" | "partial" | "cancelled";
  total: number;
  items_count: number;
  created_at: string;
  received_at?: string;
  invoice_number?: string;
  notes?: string;
}

interface PurchaseFormData {
  supplier: string;
  total: number | "";
  items_count: number;
  invoice_number: string;
  notes: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-status-warning/10 text-status-warning" },
  received: { label: "Recibido", cls: "bg-status-success/10 text-status-success" },
  partial: { label: "Parcial", cls: "bg-accent/10 text-accent" },
  cancelled: { label: "Cancelado", cls: "bg-status-danger/10 text-status-danger" },
};

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

const emptyForm: PurchaseFormData = {
  supplier: "",
  total: "",
  items_count: 1,
  invoice_number: "",
  notes: "",
};

export default function PurchasesPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PurchaseFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await purchasesService.list();
      const data = res.data.results ?? res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      addToast({ title: "Error", description: "No se pudieron cargar las compras", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (search && !o.supplier.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Modal helpers ───────────────────────────────────
  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingId(order.id);
    setForm({
      supplier: order.supplier,
      total: order.total,
      items_count: order.items_count,
      invoice_number: order.invoice_number ?? "",
      notes: order.notes ?? "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const isEditing = editingId !== null;
  const editingOrder = isEditing ? orders.find((o) => o.id === editingId) : null;
  const isReadOnly = editingOrder?.status === "received" || editingOrder?.status === "cancelled";
  const modalTitle = isReadOnly ? "Detalles de Compra" : isEditing ? "Editar Compra" : "Nueva Compra";

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.supplier.trim()) errs.supplier = "El proveedor es obligatorio";
    if (form.total === "" || Number(form.total) <= 0) errs.total = "El total debe ser mayor a 0";
    if (form.items_count < 1) errs.items_count = "Debe haber al menos 1 ítem";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      supplier: form.supplier.trim(),
      total: Number(form.total),
      items_count: form.items_count,
      invoice_number: form.invoice_number.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await purchasesService.update(editingId!, payload);
        addToast({ title: "Compra actualizada", description: `Se actualizó la orden de ${payload.supplier}`, variant: "success" });
      } else {
        await purchasesService.create(payload);
        addToast({ title: "Compra creada", description: `Se registró la orden de ${payload.supplier}`, variant: "success" });
      }
      closeModal();
      await fetchOrders();
    } catch {
      addToast({ title: "Error", description: "No se pudo guardar la compra", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Actions ─────────────────────────────────────────
  const handleMarkReceived = async (id: string) => {
    setActionLoading(id);
    try {
      await purchasesService.update(id, {
        status: "received",
        received_at: new Date().toISOString(),
      });
      addToast({ title: "Compra recibida", description: "La orden se marcó como recibida", variant: "success" });
      await fetchOrders();
    } catch {
      addToast({ title: "Error", description: "No se pudo actualizar la orden", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await purchasesService.update(id, { status: "cancelled" });
      addToast({ title: "Compra cancelada", description: "La orden se canceló correctamente", variant: "success" });
      await fetchOrders();
    } catch {
      addToast({ title: "Error", description: "No se pudo cancelar la orden", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ──────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Compras</h1>
          <p className="text-sm text-text-secondary">
            {orders.length} órdenes
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-48 h-9 pl-8 pr-3 rounded-lg bg-surface-secondary/50 border border-border text-xs"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {[
          { id: "todas", label: "Todas" },
          { id: "pending", label: "Pendientes" },
          { id: "received", label: "Recibidas" },
          { id: "partial", label: "Parciales" },
          { id: "cancelled", label: "Canceladas" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.id
                ? "bg-accent text-white"
                : "bg-surface-secondary/50 text-text-secondary hover:bg-surface-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-secondary/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Orders List */}
      {!loading && (
        <div className="space-y-3">
          {filtered.map((order) => {
            const badge = STATUS_BADGES[order.status] || STATUS_BADGES.pending;
            const canAct = order.status === "pending";
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-surface-primary p-4 cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => openEditModal(order)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{order.supplier}</h4>
                    <p className="text-[10px] text-text-tertiary">
                      {new Date(order.created_at).toLocaleDateString()} · {order.items_count} items
                      {order.invoice_number && ` · Fact. ${order.invoice_number}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{formatRD(order.total)}</p>
                  {canAct && (
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleMarkReceived(order.id)}
                        className="text-xs text-accent hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        {actionLoading === order.id ? "..." : "Marcar recibido"}
                      </button>
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleCancel(order.id)}
                        className="text-xs text-status-danger hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        {actionLoading === order.id ? "..." : "Cancelar"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-xs">No hay órdenes de compra que coincidan</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Create / Edit / View Purchase ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={fastTransition}
              className="w-full max-w-lg bg-surface-primary border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-border bg-surface-secondary/20">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" />
                  {modalTitle}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                {/* Supplier */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                    Proveedor <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isReadOnly}
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                    className={`w-full h-9 px-3 rounded-lg border text-sm transition-colors ${
                      formErrors.supplier
                        ? "border-status-danger focus:border-status-danger"
                        : "border-border focus:border-accent"
                    } bg-surface-secondary/30 focus:outline-none text-text-primary placeholder:text-text-tertiary ${
                      isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  {formErrors.supplier && (
                    <p className="text-xs text-status-danger mt-1">{formErrors.supplier}</p>
                  )}
                </div>

                {/* Total + Items count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                      Total <span className="text-status-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      readOnly={isReadOnly}
                      value={form.total}
                      onChange={(e) => setForm({ ...form, total: e.target.value ? Number(e.target.value) : "" })}
                      placeholder="0.00"
                      className={`w-full h-9 px-3 rounded-lg border text-sm transition-colors ${
                        formErrors.total
                          ? "border-status-danger focus:border-status-danger"
                          : "border-border focus:border-accent"
                      } bg-surface-secondary/30 focus:outline-none text-text-primary placeholder:text-text-tertiary ${
                        isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    />
                    {formErrors.total && (
                      <p className="text-xs text-status-danger mt-1">{formErrors.total}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                      Cant. ítems
                    </label>
                    <input
                      type="number"
                      min="1"
                      readOnly={isReadOnly}
                      value={form.items_count}
                      onChange={(e) => setForm({ ...form, items_count: Math.max(1, Number(e.target.value)) })}
                      className={`w-full h-9 px-3 rounded-lg border border-border text-sm bg-surface-secondary/30 focus:border-accent focus:outline-none text-text-primary placeholder:text-text-tertiary transition-colors ${
                        isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    />
                    {formErrors.items_count && (
                      <p className="text-xs text-status-danger mt-1">{formErrors.items_count}</p>
                    )}
                  </div>
                </div>

                {/* Invoice number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                    N° Factura
                  </label>
                  <input
                    type="text"
                    readOnly={isReadOnly}
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    placeholder="Opcional"
                    className={`w-full h-9 px-3 rounded-lg border border-border text-sm bg-surface-secondary/30 focus:border-accent focus:outline-none text-text-primary placeholder:text-text-tertiary transition-colors ${
                      isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                    Notas
                  </label>
                  <textarea
                    rows={3}
                    readOnly={isReadOnly}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Opcional"
                    className={`w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface-secondary/30 focus:border-accent focus:outline-none text-text-primary placeholder:text-text-tertiary transition-colors resize-none ${
                      isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* Received info if applicable */}
                {editingOrder?.received_at && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-status-success/5 border border-status-success/10 text-xs text-status-success">
                    <Package className="w-3.5 h-3.5" />
                    Recibido el {new Date(editingOrder.received_at).toLocaleDateString()}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
                  >
                    {isReadOnly ? "Cerrar" : "Cancelar"}
                  </button>
                  {!isReadOnly && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {isEditing ? "Guardar cambios" : "Crear compra"}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
