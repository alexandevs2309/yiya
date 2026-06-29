import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useKitchenStore } from "@/stores/kitchen.store";
import { useTablesStore } from "@/stores/tables.store";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn, formatRD } from "@/lib/utils";
import { cashierService } from "@/services/cashier.service";
import type { CashRegister } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { printCashClosing } from "@/lib/printHelper";
import {
  LayoutGrid,
  ChefHat,
  ClipboardList,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  Wallet,
  Sun,
  Moon,
  Package,
  ShoppingCart,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "tables", label: "Mesas", icon: LayoutGrid, path: "/tables", roles: ["admin", "waitress", "manager", "cashier"] },
  { id: "kitchen", label: "Cocina", icon: ChefHat, path: "/kitchen", roles: ["admin", "cook", "bartender"] },
  { id: "orders", label: "Pedidos", icon: ClipboardList, path: "/orders", roles: ["admin", "waitress", "manager", "cashier"] },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/dashboard", roles: ["admin", "owner", "manager"] },
  { id: "clients", label: "Clientes", icon: Users, path: "/clients", roles: ["admin", "manager"] },
  { id: "inventory", label: "Inventario", icon: Package, path: "/inventory", roles: ["admin", "manager", "cashier"] },
  { id: "purchases", label: "Compras", icon: ShoppingCart, path: "/purchases", roles: ["admin", "manager"] },
  { id: "reports", label: "Reportes", icon: FileText, path: "/reports", roles: ["admin", "owner", "manager"] },
  { id: "settings", label: "Ajustes", icon: Settings, path: "/settings", roles: ["admin"] },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const permissions = useAuthStore((s) => s.permissions);
  const { sidebarCollapsed: collapsed, sunMode, setSunMode } = useUIStore();
  const isOnline = useNetworkStatus();

  // Dynamic badges state
  const kitchenOrdersCount = useKitchenStore((s) => s.orders.length);
  const activeTablesCount = useTablesStore((s) => s.tables.filter((t) => t.status !== "free").length);

  const getBadgeValue = (id: string) => {
    if (id === "kitchen") return kitchenOrdersCount;
    if (id === "orders") return activeTablesCount;
    return 0;
  };

  // Cash Register State
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [closeSummary, setCloseSummary] = useState<any | null>(null);
  const { addToast } = useToast();
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState("2000");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [drawerLoading, setDrawerLoading] = useState(false);

  const canManageCash = permissions?.can_open_cashier === true;

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDrawerLoading(true);
    try {
      const amount = parseFloat(initialAmount) || 0;
      const res = await cashierService.open(amount, user.id);
      setActiveRegister(res.data);
      addToast({
        title: "Caja abierta",
        description: `Sesión de caja iniciada con ${formatRD(amount)}`,
        variant: "success",
      });
      setCashDialogOpen(false);
    } catch {
      addToast({
        title: "Error",
        description: "No se pudo abrir la caja.",
        variant: "error",
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    setDrawerLoading(true);
    try {
      const amount = parseFloat(actualCash);
      if (isNaN(amount)) {
        addToast({
          title: "Validación",
          description: "Por favor ingresa un monto válido.",
          variant: "error",
        });
        setDrawerLoading(false);
        return;
      }
      const res = await cashierService.close(activeRegister.id, amount, notes);
      setCloseSummary(res.data);
      addToast({
        title: "Arqueo completado",
        description: `Caja cerrada. Revisa el resumen de arqueo.`,
        variant: "success",
      });
      setActualCash("");
      setNotes("");
    } catch {
      addToast({
        title: "Error",
        description: "No se pudo cerrar la caja.",
        variant: "error",
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchRegister = async () => {
      try {
        const reg = await cashierService.getActive();
        if (active) {
          setActiveRegister(reg);
        }
      } catch {
        // Silence is golden
      }
    };
    fetchRegister();
    const interval = setInterval(fetchRegister, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  const isActive = (path: string) => {
    if (path === "/tables") return location.pathname === "/tables" || location.pathname === "/menu";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-bg-surface border-r border-border shrink-0 transition-all duration-200",
        collapsed ? "w-16" : "w-[200px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3 shrink-0">
        <div className="flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0">
            <span className="text-sm font-bold text-white">DY</span>
          </div>
          {!collapsed && (
            <div className="ml-2">
              <div className="flex items-center">
                <span className="text-sm font-bold text-text-primary">D'Yiya</span>
                <span className="ml-1 rounded bg-bg-elevated px-1 py-0.5 text-[8px] font-bold text-text-secondary uppercase">POS</span>
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
            isOnline ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-success animate-pulse" : "bg-danger")} />
            <span>{isOnline ? "En línea" : "Offline"}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {visibleItems.map((item) => {
          const active = isActive(item.path);
          const badge = getBadgeValue(item.id);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
                active
                  ? "bg-bg-active text-text-primary"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
              )}
              style={active ? { borderLeft: "3px solid #3B82F6", paddingLeft: "9px" } : undefined}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
              {badge > 0 && (
                collapsed ? (
                  <span className={cn(
                    "absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full",
                    item.id === "kitchen" ? "bg-danger" : "bg-accent"
                  )} />
                ) : (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                    item.id === "kitchen" ? "bg-danger" : "bg-accent"
                  )}>
                    {badge}
                  </span>
                )
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Cash + Logout */}
      <div className="border-t border-border p-2 space-y-1">
        {!collapsed && (
          <button
            onClick={() => {
              if (canManageCash) {
                setCashDialogOpen(true);
              } else {
                addToast({
                  title: "Acceso denegado",
                  description: "Solo los administradores pueden abrir o cerrar caja.",
                  variant: "error",
                });
              }
            }}
            className={cn(
              "w-full text-left rounded-lg bg-bg-elevated px-3 py-2.5 hover:bg-bg-active transition-all",
              canManageCash && "cursor-pointer"
            )}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-text-muted">
                {activeRegister ? "Caja abierta" : "Caja cerrada"}
              </span>
            </div>
            <div className="mt-1 text-sm font-bold text-text-primary">
              {formatRD(activeRegister ? (activeRegister.current_cash ?? activeRegister.initial_amount) : 0)}
            </div>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => {
              if (canManageCash) {
                setCashDialogOpen(true);
              } else {
                addToast({
                  title: "Acceso denegado",
                  description: "Solo los administradores pueden abrir o cerrar caja.",
                  variant: "error",
                });
              }
            }}
            className={cn(
              "flex w-full justify-center py-2 rounded-lg hover:bg-bg-elevated transition-all",
              canManageCash && "cursor-pointer"
            )}
          >
            <Wallet className={cn("h-5 w-5", activeRegister ? "text-success" : "text-text-muted")} />
          </button>
        )}
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-bg-elevated hover:text-danger transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button
          onClick={() => setSunMode(!sunMode)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-bg-elevated hover:text-accent transition-colors"
        >
          {sunMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {!collapsed && <span>{sunMode ? "Modo Noche" : "Modo Sol"}</span>}
        </button>
      </div>

      {/* Cash Drawer Open/Close Modal */}
      <Modal
        open={cashDialogOpen}
        onOpenChange={(open) => {
          setCashDialogOpen(open);
          if (!open && closeSummary) {
            setActiveRegister(null);
            setCloseSummary(null);
          }
        }}
        title={closeSummary ? "Arqueo y Ventas del Turno" : activeRegister ? "Arqueo y Cierre de Caja" : "Apertura de Caja"}
        description={
          closeSummary
            ? "Resumen oficial del arqueo de caja y ventas consolidadas del turno."
            : activeRegister
              ? "Verifica las ventas del día y realiza la conciliación del efectivo real en caja."
              : "Especifica el fondo inicial de efectivo para abrir la gaveta de dinero y comenzar el turno."
        }
      >
        {closeSummary ? (
          <div className="space-y-4 pt-2 text-xs text-text-secondary">
            <div className="border-2 border-dashed border-border p-4 bg-bg-elevated/10 rounded-xl space-y-3 font-mono">
              <p className="text-center font-bold text-sm tracking-wider border-b border-border/60 pb-2">
                D' YIYA SAMANÁ<br />
                REPORTE Z / ARQUEO
              </p>
              <div className="flex justify-between">
                <span>Fecha Cierre:</span>
                <span>{new Date(closeSummary.closed_at || "").toLocaleDateString()} {new Date(closeSummary.closed_at || "").toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Abierto por:</span>
                <span>{closeSummary.opened_by_name || "Admin"}</span>
              </div>
              <div className="flex justify-between">
                <span>Cerrado por:</span>
                <span>{closeSummary.closed_by_name || user?.first_name || "Admin"}</span>
              </div>
              <div className="border-t border-border/40 my-2 pt-2" />
              <div className="flex justify-between font-bold text-text-primary text-sm">
                <span>Fondo Inicial:</span>
                <span>{formatRD(parseFloat(closeSummary.initial_amount))}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo Esperado (Ventas):</span>
                <span>{formatRD(parseFloat(closeSummary.expected_cash) - parseFloat(closeSummary.initial_amount))}</span>
              </div>
              <div className="flex justify-between font-bold text-text-primary">
                <span>Total Esperado en Caja:</span>
                <span>{formatRD(parseFloat(closeSummary.expected_cash))}</span>
              </div>
              <div className="flex justify-between font-bold text-text-primary text-sm">
                <span>Efectivo Contado:</span>
                <span>{formatRD(parseFloat(closeSummary.actual_cash))}</span>
              </div>
              <div className="border-t border-border/40 my-2 pt-2" />
              <div className="flex justify-between font-extrabold text-base">
                <span>Diferencia:</span>
                <span className={parseFloat(closeSummary.difference) < 0 ? "text-danger" : "text-success"}>
                  {parseFloat(closeSummary.difference) < 0 ? "" : "+"}{formatRD(parseFloat(closeSummary.difference))}
                </span>
              </div>
              {closeSummary.notes && (
                <div className="mt-2 text-[10px] text-text-tertiary">
                  <span className="font-bold">Notas:</span> {closeSummary.notes}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  printCashClosing(closeSummary);
                  addToast({
                    title: "Impresión de arqueo",
                    description: "Enviando ticket de arqueo a la impresora térmica...",
                    variant: "success",
                  });
                }}
                className="flex-1 h-11 rounded-xl border border-border bg-bg-elevated text-xs font-semibold text-text-secondary hover:bg-bg-active transition-all"
              >
                Imprimir Arqueo
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRegister(null);
                  setCloseSummary(null);
                  setCashDialogOpen(false);
                }}
                className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent-hover text-xs font-bold text-white transition-all shadow-button"
              >
                Finalizar y Salir
              </button>
            </div>
          </div>
        ) : !activeRegister ? (
          <form onSubmit={handleOpenRegister} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Fondo Inicial en Efectivo (DOP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-bg-elevated text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                placeholder="Ej. 2000"
              />
            </div>
            <button
              type="submit"
              disabled={drawerLoading}
              className="w-full h-11 rounded-xl bg-accent hover:bg-accent-hover text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {drawerLoading ? "Abriendo..." : "Abrir Caja / Iniciar Turno"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCloseRegister} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg-elevated/20 p-3 text-xs text-text-muted">
              <div>
                <p className="text-[10px] uppercase text-text-tertiary">Apertura</p>
                <p className="font-semibold text-text-secondary mt-0.5">
                  {new Date(activeRegister.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-text-tertiary">Fondo Inicial</p>
                <p className="font-semibold text-text-secondary mt-0.5">
                  {formatRD(activeRegister.initial_amount)}
                </p>
              </div>
              <div className="col-span-2 border-t border-border/40 pt-2 mt-1">
                <p className="text-[10px] uppercase text-text-tertiary">Efectivo Esperado</p>
                <p className="text-lg font-bold text-text-primary mt-0.5">
                  {formatRD(activeRegister.current_cash ?? activeRegister.initial_amount)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Efectivo Real en Caja (DOP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-bg-elevated text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                placeholder="Ingresa el conteo físico"
              />
            </div>

            {actualCash && (
              <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-bg-elevated/40 border border-border/60">
                <span className="text-xs text-text-secondary">Diferencia:</span>
                {(() => {
                  const expected = activeRegister.current_cash ?? activeRegister.initial_amount;
                  const actual = parseFloat(actualCash) || 0;
                  const diff = actual - expected;
                  if (Math.abs(diff) < 0.01) {
                    return (
                      <span className="text-xs font-bold text-success flex items-center gap-1">
                        Cuadrado ✅
                      </span>
                    );
                  } else if (diff < 0) {
                    return (
                      <span className="text-xs font-bold text-danger flex items-center gap-1">
                        Faltante: {formatRD(diff)} ⚠️
                      </span>
                    );
                  } else {
                    return (
                      <span className="text-xs font-bold text-accent flex items-center gap-1">
                        Sobrante: +{formatRD(diff)} 📈
                      </span>
                    );
                  }
                })()}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Observaciones / Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[70px] p-3 rounded-xl border border-border bg-bg-elevated text-sm text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                placeholder="Detalla cualquier novedad o arqueo..."
              />
            </div>

            <button
              type="submit"
              disabled={drawerLoading}
              className="w-full h-12 rounded-xl bg-danger hover:bg-danger/90 text-sm font-bold text-white transition-colors disabled:opacity-50 mt-2"
            >
              {drawerLoading ? "Cerrando..." : "Confirmar Arqueo y Cerrar Caja"}
            </button>
          </form>
        )}
      </Modal>
    </aside>
  );
}
