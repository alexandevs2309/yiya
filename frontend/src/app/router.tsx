import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import type { UserRole } from "@/lib/types";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const MenuPage = lazy(() => import("@/pages/menu/MenuPage"));
const TablesPage = lazy(() => import("@/pages/tables/TablesPage"));
const KitchenPage = lazy(() => import("@/pages/kitchen/KitchenPage"));
const CheckoutPage = lazy(() => import("@/pages/checkout/CheckoutPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const ClientsPage = lazy(() => import("@/pages/clients/ClientsPage"));
const OrdersPage = lazy(() => import("@/pages/orders/OrdersPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const OrderPage = lazy(() => import("@/pages/order/OrderPage"));
const InventoryPage = lazy(() => import("@/pages/inventory/InventoryPage"));
const PurchasesPage = lazy(() => import("@/pages/purchases/PurchasesPage"));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-32 items-center justify-center text-sm text-text-muted">
          Cargando...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function GuardedLayout({ roles }: { roles: UserRole[] }) {
  return (
    <RoleGuard roles={roles}>
      <AppShell>
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Lazy><LoginPage /></Lazy>,
  },
  {
    path: "/",
    element: <GuardedLayout roles={["admin", "waitress", "cook", "owner", "manager", "cashier", "bartender"]} />,
    children: [
      { index: true, element: <Navigate to="/tables" replace /> },
      { path: "menu", element: <Lazy><MenuPage /></Lazy> },
      { path: "tables", element: <Lazy><TablesPage /></Lazy> },
      { path: "orders", element: <Lazy><OrdersPage /></Lazy> },
      { path: "order/:tableId", element: <Lazy><OrderPage /></Lazy> },
      { path: "checkout/:orderId", element: <Lazy><CheckoutPage /></Lazy> },
      { path: "kitchen", element: <Lazy><KitchenPage /></Lazy> },
      { path: "dashboard", element: <Lazy><DashboardPage /></Lazy> },
      { path: "reports", element: <Lazy><ReportsPage /></Lazy> },
      { path: "clients", element: <Lazy><ClientsPage /></Lazy> },
      { path: "inventory", element: <Lazy><InventoryPage /></Lazy> },
      { path: "purchases", element: <Lazy><PurchasesPage /></Lazy> },
      { path: "settings", element: <Lazy><SettingsPage /></Lazy> },
      // /admin is the default_route returned by backend for admins — redirect to settings
      { path: "admin", element: <Navigate to="/settings" replace /> },
    ],
  },
  {
    path: "/access-denied",
    element: <div className="flex h-screen items-center justify-center text-text-secondary">Acceso no autorizado</div>,
  },
  {
    path: "*",
    element: <Navigate to="/tables" replace />,
  },
]);
