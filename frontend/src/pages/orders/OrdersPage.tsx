import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ordersService } from "@/services/orders.service";
import { ecfService } from "@/services/ecf.service";
import { formatRD } from "@/lib/utils";
import {
  Search,
  Receipt,
  Clock,
  User,
  X,
  ChevronRight,
  Printer,
  Send,
  Calendar,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";
import type { Order } from "@/lib/types";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

function formatOrderTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatOrderDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "billing" | "paid" | "void">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersService.list({ page_size: 100 });
      const data = res.data.results || res.data;
      setOrders(data);
    } catch {
      addToast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab !== "all" && o.status !== activeTab) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTable = `mesa ${o.table_number}`.includes(q) || String(o.table_number) === q;
        const matchesWaitress = o.waitress_name?.toLowerCase().includes(q);
        const matchesId = o.id_short?.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
        return matchesTable || matchesWaitress || matchesId;
      }
      
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const handlePrintReceipt = () => {
    addToast({
      title: "Imprimiendo",
      description: `Imprimiendo recibo para la Mesa #${selectedOrder?.table_number}...`,
    });
  };

  const handleSendWhatsApp = async () => {
    if (!selectedOrder?.ecf_document?.id) {
      addToast({
        title: "Error",
        description: "No hay un comprobante e-CF asociado a este pedido.",
        variant: "error",
      });
      return;
    }

    try {
      // Assuming you import ecfService from "@/services/ecf.service"
      await ecfService.resendWhatsapp(selectedOrder.ecf_document.id);
      addToast({
        title: "Enviado a cola",
        description: `Se reenviará el e-CF al cliente de la Mesa #${selectedOrder.table_number} vía WhatsApp`,
      });
    } catch {
      addToast({
        title: "Error",
        description: "No se pudo encolar el mensaje de WhatsApp.",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-bg-base relative">
      {/* Main List Column */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Pedidos</h1>
          <p className="text-xs text-text-secondary mt-1">Historial y estado de comandas del día</p>
        </div>

        {/* Filter bar and search input */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex rounded-xl bg-bg-surface border border-border p-1 text-xs shrink-0 self-start">
            {(["all", "open", "billing", "paid", "void"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-bg-active text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab === "all" ? "Todos" : tab === "open" ? "Abiertos" : tab === "billing" ? "Facturando" : tab === "paid" ? "Pagados" : "Anulados"}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por mesa, mesero o id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-full rounded-xl bg-bg-surface pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted border border-border focus:border-accent outline-none"
            />
          </div>
        </div>

        {/* Orders list table/grid */}
        <div className="flex-1 bg-bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Receipt className="h-10 w-10 text-text-muted mb-3" />
              <p className="text-sm font-semibold text-text-secondary">No se encontraron pedidos</p>
              <p className="text-xs text-text-muted mt-1">Intenta con otros filtros o término de búsqueda</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/45 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <th className="p-3.5">Pedido</th>
                    <th className="p-3.5">Mesa</th>
                    <th className="p-3.5">Mesero/a</th>
                    <th className="p-3.5">Hora</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Total</th>
                    <th className="p-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(isSelected ? null : order)}
                        className={`hover:bg-bg-elevated/40 transition-colors cursor-pointer ${
                          isSelected ? "bg-bg-active/30" : ""
                        }`}
                      >
                        <td className="p-3.5 font-bold text-text-primary">
                          #{order.id_short || order.id.slice(0, 4)}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-text-primary">Mesa {order.table_number}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5">{order.diners || 2} personas</span>
                        </td>
                        <td className="p-3.5 text-text-secondary capitalize">
                          {order.waitress_name || "General"}
                        </td>
                        <td className="p-3.5">
                          <span className="text-text-secondary block">{formatOrderTime(order.created_at)}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5">{formatOrderDate(order.created_at)}</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              order.status === "open"
                                ? "bg-[#F97316]/10 text-[#F97316]"
                                : order.status === "billing"
                                  ? "bg-warning/10 text-warning"
                                  : order.status === "paid"
                                    ? "bg-success/10 text-success"
                                    : "bg-danger/10 text-danger"
                            }`}
                          >
                            {order.status === "open"
                              ? "En curso"
                              : order.status === "billing"
                                ? "Facturando"
                                : order.status === "paid"
                                  ? "Pagado"
                                  : "Anulado"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-extrabold text-text-primary tabular-nums">
                          {formatRD(order.total || 0)}
                        </td>
                        <td className="p-3.5">
                          <ChevronRight className={`h-4 w-4 text-text-muted transition-transform ${isSelected ? "rotate-90 text-text-secondary" : ""}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Side Panel (Drawer) */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.aside
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={fastTransition}
            className="w-[340px] shrink-0 bg-bg-surface border-l border-border flex flex-col overflow-hidden h-full z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div>
                <h2 className="text-sm font-extrabold text-text-primary">
                  Pedido #{selectedOrder.id_short || selectedOrder.id.slice(0, 4)}
                </h2>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {formatOrderDate(selectedOrder.created_at)} · {formatOrderTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-elevated text-text-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {/* Order Metadata */}
              <div className="rounded-xl bg-bg-elevated/40 border border-border p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-text-muted" />
                    Estado
                  </span>
                  <span className="capitalize font-bold text-text-primary">{selectedOrder.status}</span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-text-muted" />
                    Mesero/a
                  </span>
                  <span className="capitalize font-bold text-text-primary">{selectedOrder.waitress_name || "General"}</span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-text-muted" />
                    Comensales
                  </span>
                  <span className="font-bold text-text-primary">{selectedOrder.diners || 2} personas</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Artículos</h3>
                
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start text-xs rounded-lg bg-bg-elevated/20 p-2.5 border border-border/30"
                  >
                    <div>
                      <span className="font-bold text-text-primary">{item.quantity}x {item.name}</span>
                      {item.modifiers?.length > 0 && (
                        <p className="text-[9px] text-text-muted mt-0.5">{item.modifiers.join(" · ")}</p>
                      )}
                      {item.notes && (
                        <p className="text-[9px] text-text-muted italic mt-0.5">"{item.notes}"</p>
                      )}
                    </div>
                    <span className="font-bold text-text-secondary tabular-nums">
                      {formatRD(item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Quick Actions */}
            <div className="border-t border-border p-4 space-y-3 shrink-0">
              {/* Financial break */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-text-tertiary">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-semibold text-text-secondary">
                    {formatRD(selectedOrder.subtotal || selectedOrder.total || 0)}
                  </span>
                </div>
                {selectedOrder.itbis !== null && selectedOrder.itbis !== undefined && (
                  <div className="flex justify-between text-text-tertiary">
                    <span>ITBIS (18%)</span>
                    <span className="tabular-nums font-semibold text-text-secondary">
                      {formatRD(selectedOrder.itbis)}
                    </span>
                  </div>
                )}
                {selectedOrder.tip !== null && selectedOrder.tip !== undefined && (
                  <div className="flex justify-between text-text-tertiary">
                    <span>Propina de Ley (10%)</span>
                    <span className="tabular-nums font-semibold text-text-secondary">
                      {formatRD(selectedOrder.tip)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                  <span className="font-bold text-text-secondary">Total</span>
                  <span className="text-lg font-extrabold text-[#3B82F6] tabular-nums">
                    {formatRD(selectedOrder.total || 0)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                {selectedOrder.status === "billing" && (
                  <button
                    onClick={() => navigate(`/checkout/${selectedOrder.id}`)}
                    className="w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-accent text-xs font-bold text-white hover:bg-accent-hover transition-colors"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Ir a Cobrar Cuenta</span>
                  </button>
                )}

                <button
                  onClick={handlePrintReceipt}
                  className="w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-bg-elevated hover:bg-bg-active border border-border text-xs font-bold text-text-primary transition-colors"
                >
                  <Printer className="h-4 w-4 text-text-secondary" />
                  <span>Reimprimir Comanda</span>
                </button>

                {selectedOrder.status === "paid" && (
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-bg-elevated hover:bg-bg-active border border-border text-xs font-bold text-text-primary transition-colors"
                  >
                    <Send className="h-4 w-4 text-text-secondary" />
                    <span>Reenviar WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
