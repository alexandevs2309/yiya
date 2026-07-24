import { type ModuleId, useNavigationStore } from '@/stores/navigation-store'
import { useAppStore } from '@/stores/app-store'
import { roleAccess } from '@/App'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { dashboardApi, type DashboardData } from '@/services/api'
import {
  LayoutDashboard, Grid3X3, ShoppingCart, ChefHat, DollarSign,
  FileText, Package, Users, BarChart3, Settings, Wallet,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface NavItem {
  id: ModuleId
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'floor-plan', label: 'Plano de Mesas', icon: Grid3X3 },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'kds', label: 'Cocina (KDS)', icon: ChefHat },
  { id: 'cashier', label: 'Caja', icon: DollarSign },
  { id: 'cash-register', label: 'Registro Caja', icon: Wallet },
  { id: 'invoicing', label: 'Facturación', icon: FileText },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const user = useAppStore((s) => s.user)
  const currentSaleTotal = useAppStore((s) => s.currentSaleTotal)
  const { activeModule, setActiveModule } = useNavigationStore()
  const [collapsed, setCollapsed] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [monthSales, setMonthSales] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        const end = today.toISOString().split('T')[0]
        const [todayData, monthData] = await Promise.all([
          dashboardApi.get(),
          dashboardApi.get(start, end),
        ])
        setDashboardData(todayData)
        setMonthSales(monthData.ventas_hoy)
      } catch {}
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const permittedNavItems = navItems.filter(
    (item) => user && (roleAccess[item.id] || ['admin']).includes(user.role)
  )

  const sidebarContent = (
    <div className={cn(
      'flex flex-col h-full bg-sidebar',
      collapsed ? 'w-[68px]' : 'w-[240px]',
    )}>
      <div className={cn("flex items-center h-16 border-b border-border shrink-0 relative transition-all", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        <div className={cn("flex items-center gap-2 min-w-0 transition-all", collapsed && "opacity-0 absolute")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 shrink-0 overflow-hidden">
            <img src="/logo.png" alt="D'Yiya" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="truncate"
            >
              <span className="font-semibold text-sm tracking-tight text-sidebar-foreground block leading-tight">
                D'Yiya
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Restaurant POS
              </span>
            </motion.div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all shrink-0 z-10",
            collapsed ? "w-10 h-10 mx-auto" : "w-7 h-7",
            "hidden md:inline-flex"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="md:hidden w-8 h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {permittedNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeModule === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'w-full justify-start gap-3 text-sm font-medium transition-all rounded-lg',
                collapsed && 'justify-center px-0 h-10 w-10 mx-auto',
                isActive
                  ? 'bg-primary/10 text-sidebar-foreground border-l-[3px] border-primary rounded-l-none shadow-sm'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-primary/5',
              )}
              onClick={() => setActiveModule(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-sidebar-foreground/50',
                )}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </Button>
          )
        })}
      </nav>

      {/* Stats footer */}
      {!collapsed && (
        <div className="border-t border-border/60 bg-gradient-to-t from-sidebar via-sidebar to-transparent">
          <div className="px-3 py-3 space-y-2.5">
            {/* Cajero row */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                <span className="text-[11px] font-bold text-primary">
                  {user?.first_name?.[0] || user?.username?.[0] || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.08em] leading-none mb-0.5">CAJERO</p>
                <p className="text-sm font-bold text-sidebar-foreground truncate leading-tight">{user?.first_name || user?.username}</p>
              </div>
            </div>
            {/* Stats cards */}
            <div className="space-y-1">
              <div className="flex items-center justify-between bg-sidebar/60 rounded-lg border border-border/40 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">VENTAS DE HOY</span>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(dashboardData?.ventas_hoy || 0)}</span>
              </div>
              <div className="flex items-center justify-between bg-sidebar/60 rounded-lg border border-border/40 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">VENTA ACTUAL</span>
                </div>
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(currentSaleTotal)}</span>
              </div>
              <div className="flex items-center justify-between bg-sidebar/60 rounded-lg border border-border/40 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">VENTAS DEL MES</span>
                </div>
                <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">{formatCurrency(monthSales)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col border-r bg-sidebar h-screen sticky top-0 z-30"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden border-r bg-sidebar shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

