import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTablesStore } from "@/stores/tables.store";
import { useCartStore } from "@/stores/cart.store";
import { TableCard } from "@/components/shared/TableCard";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { tablesService } from "@/services/tables.service";
import { ordersService } from "@/services/orders.service";
import { WifiOff, Sun, LampCeiling, Waves, Users, Timer, Receipt } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { Table, Order } from "@/lib/types";

const zoneIcons: Record<string, React.ReactNode> = {
  Terraza: <Sun className="h-4 w-4" />,
  Interior: <LampCeiling className="h-4 w-4" />,
  Barra: <Waves className="h-4 w-4" />,
};

export default function TablesPage() {
  const { tables, setTables } = useTablesStore();
  const setTableId = useCartStore((s) => s.setTableId);
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { addToast } = useToast();

  useWebSocket();

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTables = async () => {
    try {
      const res = await tablesService.list();
      setTables(res.data.results || res.data);
    } catch {
      addToast({
        title: "Error de red",
        description: "No se pudo actualizar el estado de las mesas.",
        variant: "error",
      });
    }
  };

  const handleTableTap = async (table: Table) => {
    setTableId(table.id);
    if (table.status === "free" || table.status === "occupied") {
      navigate(`/order/${table.id}`);
    } else if (table.status === "billing") {
      try {
        const res = await ordersService.list({ table: table.id, status: "billing" });
        const orders: Order[] = res.data.results || res.data;
        if (orders.length > 0) {
          navigate(`/checkout/${orders[0].id}`);
        } else {
          addToast({
            title: "Error",
            description: "No se encontró una orden facturando para esta mesa.",
            variant: "error",
          });
        }
      } catch {
        addToast({
          title: "Error",
          description: "No se pudo obtener la orden de cobro de esta mesa.",
          variant: "error",
        });
      }
    }
  };

  const zones = tables.reduce<Record<string, Table[]>>((acc, t) => {
    const zone = t.zone_name || "General";
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(t);
    return acc;
  }, {});

  const freeCount = tables.filter(t => t.status === "free").length;
  const occupiedCount = tables.filter(t => t.status === "occupied").length;
  const billingCount = tables.filter(t => t.status === "billing").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Control: resumen instantáneo de situación */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Mesas</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-status-free-text">
              <span className="h-1.5 w-1.5 rounded-full bg-status-free-dot" />
              {freeCount} libres
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-status-occupied-text">
              <span className="h-1.5 w-1.5 rounded-full bg-status-occupied-dot" />
              {occupiedCount} ocupadas
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-status-billing-text">
              <span className="h-1.5 w-1.5 rounded-full bg-status-billing-dot" />
              {billingCount} cuentas
            </span>
          </div>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning">
            <WifiOff className="h-3.5 w-3.5" />
            Solo efectivo
          </div>
        )}
      </div>

      {/* Zonas — cada una como un sector visual del restaurante */}
      {Object.entries(zones).map(([zoneName, zoneTables]) => (
        <section key={zoneName}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-text-tertiary">
              {zoneIcons[zoneName] || <Waves className="h-4 w-4" />}
            </span>
            <h2 className="text-sm font-semibold text-text-primary">{zoneName}</h2>
            <span className="text-xs text-text-tertiary">· {zoneTables.length} mesas</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {zoneTables.map((table, i) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <TableCard table={table} onSelect={handleTableTap} />
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
