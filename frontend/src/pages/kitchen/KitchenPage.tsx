import { useEffect } from "react";
import { motion } from "framer-motion";
import { useKitchenStore } from "@/stores/kitchen.store";
import { ordersService } from "@/services/orders.service";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn, formatMinutes } from "@/lib/utils";
import { ALERT_MINUTES } from "@/lib/constants";
import { Check, WifiOff, Timer, Clock, ChefHat } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { OrderItem } from "@/lib/types";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

function getItemMinutes(item: OrderItem): number {
  if (!item.created_at) return 0;
  const created = new Date(item.created_at).getTime();
  return Math.floor((Date.now() - created) / 60000);
}

function KitchenOrderCard({ order }: { order: any }) {
  const updateItemStatus = useKitchenStore((s) => s.updateItemStatus);
  const { addToast } = useToast();

  const pendingItems = order.items.filter(
    (i: OrderItem) => i.status === "pending" || i.status === "preparing",
  );
  const maxMinutes = pendingItems.reduce(
    (max: number, i: OrderItem) => Math.max(max, getItemMinutes(i)),
    0,
  );
  const isAnyLate = pendingItems.some((i: OrderItem) => getItemMinutes(i) >= ALERT_MINUTES);

  const handleMarkReady = async (itemId: string) => {
    updateItemStatus(itemId, "ready");
    try {
      await ordersService.markReady(order.id, itemId);
    } catch {
      updateItemStatus(itemId, "pending");
      addToast({ title: "Error", description: "No se pudo marcar como listo", variant: "error" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fastTransition}
      className={cn(
        "rounded-xl border bg-bg-surface p-4",
        isAnyLate ? "border-danger" : "border-border",
      )}
    >
      {/* N2: Mesa + badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-text-primary">
            Mesa {order.table_number}
          </span>
          {order.status === "billing" && (
            <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
              Cuenta
            </span>
          )}
        </div>
        {/* N1: Timer — grande y visible */}
        <div className={cn(
          "flex items-center gap-1.5 text-base font-extrabold tabular-nums",
          isAnyLate ? "text-danger" : "text-text-primary",
        )}>
          <Timer className={cn("h-4 w-4", isAnyLate && "animate-pulse-dot")} />
          {formatMinutes(maxMinutes)}
        </div>
      </div>

      {/* N1: Items pendientes */}
      <div className="space-y-2">
        {pendingItems.map((item: OrderItem) => {
          const mins = getItemMinutes(item);
          const isLate = mins >= ALERT_MINUTES;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150",
                isLate ? "bg-danger/10" : "bg-bg-elevated",
              )}
            >
              {/* N1: nombre + cantidad */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-text-primary">
                    {item.quantity}x {item.name}
                  </span>
                  {isLate && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                      !
                    </span>
                  )}
                </div>
                {/* N3: modificadores y notas */}
                {item.modifiers?.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-0.5">{item.modifiers.join(" · ")}</p>
                )}
                {item.notes && (
                  <p className="text-xs text-text-tertiary italic mt-0.5">"{item.notes}"</p>
                )}
              </div>

              {/* N1: Botón marcar listo — grande */}
              <button
                onClick={() => handleMarkReady(item.id)}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150",
                  isLate
                    ? "bg-danger text-white hover:brightness-110"
                    : "bg-success/15 text-success hover:brightness-95",
                )}
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function KitchenPage() {
  const { orders, setOrders } = useKitchenStore();
  const isOnline = useNetworkStatus();
  const { addToast } = useToast();

  useWebSocket();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await ordersService.list({ status__in: "open,billing", page_size: 50 });
      const allOrders = res.data.results || res.data;
      const active = allOrders.filter(
        (o: any) =>
          o.status === "billing" ||
          o.items?.some((i: any) => i.status === "pending" || i.status === "preparing"),
      );
      setOrders(active);
    } catch {
      addToast({ title: "Error", description: "No se pudieron cargar las órdenes", variant: "error" });
    }
  };

  const pendingCount = orders.reduce(
    (sum, o) => sum + o.items.filter((i) => i.status === "pending" || i.status === "preparing").length,
    0,
  );

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cocina</h1>
          <p className="text-sm text-text-secondary mt-1">{pendingCount} comandas pendientes</p>
        </div>
        {/* N4: conectividad */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">
            <WifiOff className="h-3 w-3" />
            LAN
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
          <div className="h-16 w-16 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-text-muted" />
          </div>
          <div>
            <p className="text-base font-semibold text-text-secondary">Cocina libre</p>
            <p className="text-sm text-text-muted mt-1">Las órdenes de las mesas aparecerán aquí en tiempo real</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-success">Conectado al sistema</span>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 gap-4 overflow-y-auto scrollbar-thin sm:grid-cols-2 lg:grid-cols-3 auto-rows-min">
          {orders.map((order) => (
            <KitchenOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
