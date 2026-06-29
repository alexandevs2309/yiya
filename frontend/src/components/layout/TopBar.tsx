import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useOfflineStore } from "@/stores/offline.store";
import { NetworkBadge } from "./NetworkBadge";
import { db } from "@/services/db";
import { formatRD } from "@/lib/utils";
import { Search, Bell, Menu, ChevronDown, CloudUpload, RefreshCw, X, AlertTriangle } from "lucide-react";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Unsynced orders queue state
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingOrders = useOfflineStore((s) => s.pendingOrders);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleRetryOrder = async (orderId: string) => {
    setSyncing(true);
    try {
      const order = await db.getOrder(orderId);
      if (order) {
        order.sync_attempts = 0;
        await db.saveOrder(order);
        await useOfflineStore.getState().loadPendingOrders();
        
        // Force trigger of useOfflineSync useEffect hook by toggling isOnline
        if (isOnline) {
          useOfflineStore.getState().setIsOnline(false);
          useOfflineStore.getState().setIsOnline(true);
        }
      }
    } catch (err) {
      console.error("Failed to retry sync:", err);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  const handleForceSyncAll = async () => {
    setSyncing(true);
    try {
      for (const order of pendingOrders) {
        const o = await db.getOrder(order.id);
        if (o) {
          o.sync_attempts = 0;
          await db.saveOrder(o);
        }
      }
      await useOfflineStore.getState().loadPendingOrders();
      if (isOnline) {
        useOfflineStore.getState().setIsOnline(false);
        useOfflineStore.getState().setIsOnline(true);
      }
    } catch (err) {
      console.error("Failed to force sync all:", err);
    } finally {
      setTimeout(() => setSyncing(false), 1200);
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-bg-surface px-4 shadow-topbar shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo (mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <span className="text-sm font-bold text-white">DY</span>
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary">D' Yiya</div>
          <div className="text-[10px] font-medium text-text-muted">Restaurante</div>
        </div>
      </div>

      {/* Search - Centered */}
      <div className="relative flex-1 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar productos, categorías..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-lg bg-bg-elevated pl-9 pr-14 text-sm text-text-primary placeholder:text-text-muted border border-border focus:border-accent outline-none transition-all focus:ring-1 focus:ring-accent"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded bg-bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-muted border border-border">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Network status badge */}
        <NetworkBadge />

        {/* Sync queue indicator */}
        {pendingOrders.length > 0 && (
          <button
            onClick={() => setShowQueueModal(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#F97316] bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-colors"
            title={`${pendingOrders.length} comanda(s) pendientes de sincronización`}
          >
            <CloudUpload className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F97316] text-[9px] font-extrabold text-white">
              {pendingOrders.length}
            </span>
          </button>
        )}

        {/* Notifications with badge '3' */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-extrabold text-white">
            3
          </span>
        </button>

        {/* User with avatar and chevron dropdown */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border cursor-pointer group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden bg-accent shrink-0 border border-border"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
              alt="Avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors flex items-center gap-1">
              <span>{user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.username || "Carlos García"}</span>
            </div>
            <div className="text-[10px] font-medium text-text-muted capitalize">
              {user?.role === "admin" ? "Admin" : user?.role === "cook" ? "Cocinero" : "Mesero"}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
        </div>
      </div>

      {/* Sync Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <CloudUpload className="h-4.5 w-4.5 text-[#F97316]" />
                Cola de Sincronización Offline
              </h3>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="p-1 rounded hover:bg-bg-elevated text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-text-secondary">
              Estas comandas se crearon o cobraron sin internet y se están reintentando subir al servidor.
            </p>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
              {pendingOrders.map((o) => {
                const isFailed = (o.sync_attempts || 0) >= 3;
                return (
                  <div
                    key={o.id}
                    className="p-3.5 rounded-xl border border-border bg-bg-elevated/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-text-primary">Mesa #{o.table_number || o.table}</p>
                      <p className="text-[9px] text-text-secondary mt-0.5">
                        ID: {o.id_short} · {formatRD(o.total || 0)}
                      </p>
                      {isFailed && (
                        <p className="text-[8px] text-danger font-semibold flex items-center gap-0.5 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Sincronización suspendida (3 fallos)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={syncing || !isOnline}
                        onClick={() => handleRetryOrder(o.id)}
                        className="h-8 w-8 rounded-lg bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center border border-border"
                        title="Reintentar ahora"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              <button
                type="button"
                disabled={syncing || !isOnline}
                onClick={handleForceSyncAll}
                className="flex-1 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white transition-all shadow-button flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {syncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sincronizar Todo
              </button>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="flex-1 h-10 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-xs font-semibold text-text-secondary transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
