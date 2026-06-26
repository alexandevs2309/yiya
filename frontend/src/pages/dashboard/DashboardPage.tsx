import { useEffect, useState, useMemo } from "react";
import { ordersService } from "@/services/orders.service";
import { formatRD } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  ArrowRight,
  Clock,
  Award,
  Calendar,
  Percent,
} from "lucide-react";
import type { Order } from "@/lib/types";

interface SalesDay {
  dayName: string;
  amount: number;
}

function formatOrderTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ordersService.list({ page_size: 100 });
      const data = res.data.results || res.data;
      setOrders(data);
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  };

  // 1. Stats calculations
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    
    // Filter paid orders of today
    const todayOrders = orders.filter(
      (o) => o.status === "paid" && new Date(o.created_at).toDateString() === today
    );

    const totalSales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalItbis = todayOrders.reduce((sum, o) => sum + (o.itbis || 0), 0);
    const orderCount = todayOrders.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      totalSales,
      totalItbis,
      orderCount,
      avgTicket,
      todayOrders: todayOrders.slice(-5).reverse(), // Last 5 orders
    };
  }, [orders]);

  // 2. Top Selling items
  const topItems = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; category: string }> = {};
    
    orders
      .filter((o) => o.status === "paid")
      .forEach((o) => {
        o.items?.forEach((item) => {
          const key = item.name;
          if (!counts[key]) {
            counts[key] = { name: item.name, qty: 0, category: item.menu_item || "General" };
          }
          counts[key].qty += item.quantity;
        });
      });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // 3. Weekly Trend (SVG chart data)
  const weeklyTrend = useMemo((): SalesDay[] => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const last7Days: SalesDay[] = [];

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        dayName: days[d.getDay()],
        amount: 0,
      });
    }

    // Populate sales
    orders
      .filter((o) => o.status === "paid")
      .forEach((o) => {
        const orderDate = new Date(o.created_at);
        const orderDayStr = orderDate.toLocaleDateString();
        
        // Find if matches one of the last 7 days
        for (let i = 0; i < 7; i++) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - (6 - i));
          if (targetDate.toLocaleDateString() === orderDayStr) {
            last7Days[i].amount += Number(o.total) || 0;
            break;
          }
        }
      });

    return last7Days;
  }, [orders]);

  // 4. SVG Plot points generator
  const chartPoints = useMemo(() => {
    const maxAmount = Math.max(...weeklyTrend.map((d) => d.amount), 1000);
    const height = 140; // max SVG height area
    const width = 420;  // max SVG width area
    const padding = 30;

    const points = weeklyTrend.map((d, i) => {
      const x = padding + (i * (width - padding * 2)) / 6;
      // Invert Y axis for SVG
      const safeAmount = Number(d.amount) || 0;
      const y = height - padding - (safeAmount / maxAmount) * (height - padding * 2);
      return { x: x || 0, y: y || 0, label: d.dayName, val: safeAmount };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const closedPathD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return { points, pathD, closedPathD, maxAmount };
  }, [weeklyTrend]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 flex flex-col justify-center items-center h-full bg-bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-xs text-text-muted mt-2">Cargando métricas de caja...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-bg-base overflow-y-auto scrollbar-thin h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-secondary mt-1">Resumen del negocio y caja</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface border border-border px-3 py-1.5 text-xs text-text-secondary">
          <Calendar className="h-3.5 w-3.5" />
          <span>Hoy, {new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Ventas hoy", value: formatRD(stats.totalSales), icon: DollarSign, color: "text-success bg-success/10" },
          { label: "Comandas hoy", value: stats.orderCount.toString(), icon: Receipt, color: "text-accent bg-accent/10" },
          { label: "Ticket Promedio", value: formatRD(stats.avgTicket), icon: TrendingUp, color: "text-warning bg-warning/10" },
          { label: "ITBIS recaudado", value: formatRD(stats.totalItbis), icon: Percent, color: "text-purple-500 bg-purple-500/10" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            className="rounded-xl border border-border bg-bg-surface p-4 flex flex-col justify-between h-24"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">{card.label}</span>
              <div className={`p-1.5 rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-lg font-extrabold text-text-primary tabular-nums tracking-tight mt-2">
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Center Layout: Graph & Top Sellers */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Trend Graph */}
        <div className="rounded-xl border border-border bg-bg-surface p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Tendencia de Ventas (7 días)</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Ventas facturadas en pesos dominicanos</p>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-44 mt-4 w-full">
            <svg viewBox="0 0 420 140" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="390" y2="20" stroke="#2D3148" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="30" y1="70" x2="390" y2="70" stroke="#2D3148" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="30" y1="110" x2="390" y2="110" stroke="#2D3148" strokeWidth="1" />

              {/* Area path */}
              {chartPoints.closedPathD && (
                <path d={chartPoints.closedPathD} fill="url(#chartGrad)" />
              )}

              {/* Stroke path */}
              {chartPoints.pathD && (
                <path d={chartPoints.pathD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Interactive Points */}
              {chartPoints.points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="3" fill="#3B82F6" stroke="#0F1117" strokeWidth="1" />
                  {/* Label Day */}
                  <text x={p.x} y="130" textAnchor="middle" fill="#64748B" className="text-[9px] font-bold">
                    {p.label}
                  </text>
                  {/* Tooltip value */}
                  {p.val > 0 && (
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#F1F5F9" className="text-[8px] font-extrabold tabular-nums">
                      RD$ {Math.round(p.val / 100) / 10}k
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Top Selling Food Items */}
        <div className="rounded-xl border border-border bg-bg-surface p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-text-primary">Platos Más Vendidos</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Volumen total de comandas del mes</p>
          </div>

          {topItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-text-tertiary">
              <Award className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-xs font-semibold">Sin registros de ventas</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {topItems.map((item) => {
                const maxQty = topItems[0].qty || 1;
                const percent = Math.round((item.qty / maxQty) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                      <span className="truncate">{item.name}</span>
                      <span className="tabular-nums text-text-secondary">{item.qty} u.</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Layout: Recent Orders Table */}
      <div className="rounded-xl border border-border bg-bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Últimas transacciones cobradas</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Comandas de caja completadas hoy</p>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover transition-colors"
          >
            <span>Ver todo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {stats.todayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <Clock className="h-6 w-6 mb-2" />
            <p className="text-xs">Sin transacciones completadas hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.todayOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="flex items-center justify-between rounded-xl bg-bg-elevated/40 border border-border/30 px-4 py-3 hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-text-primary bg-bg-active px-2.5 py-1 rounded-lg">
                    Mesa {order.table_number}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-text-primary block">
                      #{order.id_short || order.id.slice(0, 4)}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {order.items?.length || 0} platos · {order.payment_method === "cash" ? "Efectivo" : order.payment_method === "card" ? "Tarjeta" : "Transferencia"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-success block tabular-nums">
                    {formatRD(order.total || 0)}
                  </span>
                  <span className="text-[9px] text-text-muted block font-medium">
                    {formatOrderTime(order.created_at)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
