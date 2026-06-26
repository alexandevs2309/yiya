import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OrderPanel } from "./OrderPanel";
import { useAuthStore } from "@/stores/auth.store";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { useLocation } from "react-router-dom";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const user = useAuthStore((s) => s.user);
  const { showWarning, timeLeft } = useIdleTimer();
  const location = useLocation();

  // Hide the global OrderPanel sidebar when inside /order/:tableId or /checkout/:orderId
  // because those pages have their own cart/payment UI
  const isOrderPage = location.pathname.startsWith("/order/");
  const isCheckoutPage = location.pathname.startsWith("/checkout/");

  const showOrderPanel =
    (user?.role === "admin" || user?.role === "waitress" || user?.role === "manager") &&
    !isOrderPage &&
    !isCheckoutPage;

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Right Order Panel — only for waitress/admin/manager */}
      {showOrderPanel && <OrderPanel />}

      {/* Inactivity warning banner */}
      {showWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-warning/30 bg-bg-surface px-5 py-3 shadow-modal">
          <span className="text-sm font-semibold text-warning">
            Sesión inactiva — cerrará en {timeLeft}s
          </span>
          <button
            onClick={() => {/* el timer se reinicia por cualquier click/toque */}}
            className="rounded-lg bg-warning/10 px-3 py-1 text-xs font-bold text-warning hover:bg-warning/20 transition-colors"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
