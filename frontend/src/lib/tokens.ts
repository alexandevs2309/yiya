export const COLORS = {
  bg: {
    base: "#0F1117",
    surface: "#1A1D27",
    elevated: "#22263A",
    active: "#2A2F47",
  },
  accent: {
    DEFAULT: "#3B82F6",
    hover: "#2563EB",
  },
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    muted: "#475569",
  },
  border: "#2D3148",
  borderStrong: "#3D4268",
} as const;

export const CATEGORY_COLORS: Record<string, { bg: string; light: string }> = {
  pescados: { bg: "#0369A1", light: "#0EA5E9" },
  mariscos: { bg: "#6D28D9", light: "#8B5CF6" },
  carnes: { bg: "#B91C1C", light: "#EF4444" },
  bebidas: { bg: "#B45309", light: "#F59E0B" },
  postres: { bg: "#9D174D", light: "#EC4899" },
  otros: { bg: "#4338CA", light: "#6366F1" },
};

export const NAV_ITEMS = [
  { id: "tables", label: "Mesas", icon: "LayoutGrid", path: "/tables", roles: ["admin", "waitress"] },
  { id: "kitchen", label: "Cocina", icon: "ChefHat", path: "/kitchen", roles: ["admin", "cook"] },
  { id: "orders", label: "Pedidos", icon: "ClipboardList", path: "/orders", roles: ["admin", "waitress"] },
  { id: "dashboard", label: "Dashboard", icon: "BarChart3", path: "/dashboard", roles: ["admin"] },
  { id: "clients", label: "Clientes", icon: "Users", path: "/clients", roles: ["admin"] },
  { id: "reports", label: "Reportes", icon: "FileText", path: "/reports", roles: ["admin"] },
  { id: "settings", label: "Ajustes", icon: "Settings", path: "/settings", roles: ["admin"] },
] as const;

export const FONTS = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;
