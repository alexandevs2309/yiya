import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Bell,
  Volume2,
  X,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ordersService } from "@/services/orders.service";
import { formatRD } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
  notes: string;
  status: "pending" | "preparing" | "ready" | "served";
  menuItemId: string;
}

interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  waitressName: string;
  diners: number;
  status: "open" | "preparing" | "ready" | "served" | "billing" | "paid" | "void";
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  total: number;
}

type FilterStatus = "all" | "pending" | "preparing" | "ready";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  preparing: { label: "Preparando", color: "bg-info/10 text-info border-info/30", icon: Loader2 },
  ready: { label: "Listo", color: "bg-success/10 text-success border-success/30", icon: CheckCircle },
  served: { label: "Entregado", color: "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/30", icon: CheckCircle },
} as const;

const ITEM_STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-warning/10 text-warning border-warning/30" },
  preparing: { label: "Preparando", color: "bg-info/10 text-info border-info/30" },
  ready: { label: "Listo", color: "bg-success/10 text-success border-success/30" },
  served: { label: "Entregado", color: "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/30" },
} as const;

export default function KitchenPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, total: 0 });

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    const hasMatchingItems = order.items.some((item) => item.status === filter);
    return hasMatchingItems;
  });

  const updateStats = useCallback((ordersList: Order[]) => {
    const stats = { pending: 0, preparing: 0, ready: 0, total: ordersList.length };
    ordersList.forEach((order) => {
      order.items.forEach((item) => {
        if (item.status === "pending") stats.pending++;
        else if (item.status === "preparing") stats.preparing++;
        else if (item.status === "ready") stats.ready++;
      });
    });
    setStats(stats);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkgBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTgIBA"
    );
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, [soundEnabled]);

  const showNotification = useCallback(
    (message: string) => {
      if (message === lastNotification) return;
      setLastNotification(message);
      addToast({
        title: "🍳 Nueva orden en cocina",
        description: message,
        variant: "default",
      });
      playNotificationSound();
    },
    [lastNotification, addToast, playNotificationSound]
  );

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/kitchen/`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setConnected(true);
      console.log("[Kitchen] WebSocket conectado");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "order.created" || data.type === "order.updated") {
          const newOrder: Order = data.order;
          setOrders((prev) => {
            const exists = prev.find((o) => o.id === newOrder.id);
            if (exists) {
              return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
            } else {
              showNotification(`Mesa ${newOrder.tableNumber} - ${newOrder.items.length} platos`);
              return [newOrder, ...prev];
            }
          });
        } else if (data.type === "order.item_status") {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === data.orderId
                ? {
                    ...o,
                    items: o.items.map((item) =>
                      item.id === data.itemId ? { ...item, status: data.status } : item
                    ),
                  }
                : o
            )
          );
        } else if (data.type === "order.deleted") {
          setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
        }
      } catch (e) {
        console.error("[Kitchen] Error parseando WS:", e);
      }
    };

    websocket.onclose = () => {
      setConnected(false);
      console.log("[Kitchen] WebSocket desconectado, reconectando en 3s...");
      setTimeout(connectWebSocket, 3000);
    };

    websocket.onerror = (error) => {
      console.error("[Kitchen] WebSocket error:", error);
    };

    setWs(websocket);
  }, [showNotification]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, [connectWebSocket, ws]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersService.list({ status: "preparing" });
      const data = res.data.results ?? res.data;
      setOrders(data);
      updateStats(data);
    } catch (err) {
      console.error("[Kitchen] Error cargando órdenes:", err);
      addToast({ title: "Error", description: "No se pudieron cargar las órdenes", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast, updateStats]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: OrderItem["status"]) => {
    try {
      await ordersService.updateItemStatus(orderId, itemId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item)),
              }
            : o
        )
      );
    } catch (err) {
      addToast({ title: "Error", description: "No se pudo actualizar el estado", variant: "error" });
    }
  };

  const getOrderStatus = (order: Order): keyof typeof STATUS_CONFIG => {
    const statuses = order.items.map((i) => i.status);
    if (statuses.every((s) => s === "served")) return "served";
    if (statuses.every((s) => s === "ready")) return "ready";
    if (statuses.some((s) => s === "preparing")) return "preparing";
    return "pending";
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg-base">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg-surface/95 backdrop-blur-sm px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <ChefHat className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Cocina</h1>
              <p className="text-xs text-text-tertiary">Gestión de órdenes en tiempo real</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">
                <Clock className="h-3 w-3" /> {stats.pending}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-info/10 text-info font-medium">
                <Loader2 className="h-3 w-3" /> {stats.preparing}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">
                <CheckCircle className="h-3 w-3" /> {stats.ready}
              </span>
            </div>

            {/* Connection status */}
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", connected ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
              {connected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  En vivo
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                  Reconectando...
                </>
              )}
            </div>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", soundEnabled ? "bg-bg-elevated text-text-primary" : "bg-bg-elevated/50 text-text-tertiary")}
            >
              <Volume2 className="h-4 w-4" />
              {soundEnabled ? "Sonido ON" : "Sonido OFF"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", "pending", "preparing", "ready"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-accent text-white shadow-sm" : "bg-bg-elevated text-text-secondary hover:bg-bg-active hover:text-text-primary"
              )}
            >
              {f === "all" ? "Todas" : f === "pending" ? "Pendientes" : f === "preparing" ? "En preparación" : "Listas"}
            </button>
          ))}
        </div>
      </header>

      {/* Orders Grid */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 text-text-tertiary">
            <ChefHat className="h-16 w-16 opacity-30" />
            <p className="text-lg font-medium">No hay órdenes {filter !== "all" ? `(${filter})` : ""}</p>
            <p className="text-sm">Las nuevas órdenes aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => {
                const orderStatus = getOrderStatus(order);
                const statusConfig = STATUS_CONFIG[orderStatus];
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={fastTransition}
                    className="flex flex-col h-full bg-bg-surface border border-border rounded-2xl shadow-card overflow-hidden"
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between border-b border-border p-4 bg-bg-base/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                          <TrendingUp className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">Mesa #{order.tableNumber}</p>
                          <p className="text-xs text-text-tertiary">{order.waitressName} • {order.diners} comensales</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusConfig.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-text-tertiary font-mono">
                          {new Date(order.createdAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {order.items
                        .filter((item) => filter === "all" || item.status === filter)
                        .map((item) => {
                          const itemConfig = ITEM_STATUS_CONFIG[item.status];
                          const canPrepare = item.status === "pending";
                          const canReady = item.status === "preparing";
                          const canServe = item.status === "ready";

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={fastTransition}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border bg-bg-base/50"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-text-primary truncate">{item.name}</p>
                                    {item.modifiers.length > 0 && (
                                      <p className="text-[10px] text-text-tertiary mt-0.5">{item.modifiers.join(" · ")}</p>
                                    )}
                                    {item.notes && (
                                      <p className="text-[10px] text-text-tertiary italic mt-0.5">"{item.notes}"</p>
                                    )}
                                  </div>
                                  <span className="shrink-0 text-sm font-bold text-text-primary">{item.quantity}x</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", itemConfig.color)}>
                                    {ITEM_STATUS_CONFIG[item.status].label}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {canPrepare && (
                                  <button
                                    onClick={() => updateItemStatus(order.id, item.id, "preparing")}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors"
                                    title="Marcar como preparando"
                                  >
                                    <Loader2 className="h-4 w-4" />
                                  </button>
                                )}
                                {canReady && (
                                  <button
                                    onClick={() => updateItemStatus(order.id, item.id, "ready")}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                                    title="Marcar como listo"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}
                                {canServe && (
                                  <button
                                    onClick={() => updateItemStatus(order.id, item.id, "served")}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                                    title="Marcar como entregado"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      {order.items.every((item) => filter !== "all" && item.status !== filter) && (
                        <div className="text-center py-4 text-text-tertiary text-xs">
                          No hay items con este filtro
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-border p-3 bg-bg-base/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-tertiary">
                          Total: <span className="font-bold text-text-primary">{formatRD(order.total)}</span>
                        </span>
                        <div className="flex gap-1.5">
                          {orderStatus === "preparing" && order.items.some((i) => i.status === "preparing") && (
                            <button
                              onClick={() => order.items.filter((i) => i.status === "preparing").forEach((i) => updateItemStatus(order.id, i.id, "ready"))}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                            >
                              Marcar todo listo
                            </button>
                          )}
                          {orderStatus === "ready" && (
                            <button
                              onClick={() => order.items.filter((i) => i.status === "ready").forEach((i) => updateItemStatus(order.id, i.id, "served"))}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            >
                              Entregar todo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}