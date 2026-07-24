import { type ModuleId, useNavigationStore } from '@/stores/navigation-store'
import { useAppStore } from '@/stores/app-store'
import { roleAccess } from '@/App'
import { cn, formatCurrency } from '@/lib/utils'
import { dashboardApi, type DashboardData } from '@/services/api'
import {
  LayoutDashboard, Grid3X3, ShoppingCart, ChefHat, DollarSign,
  FileText, Package, Users, BarChart3, Settings, Wallet,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  id: ModuleId
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'floor-plan', label: 'Mesas', icon: Grid3X3 },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'kds', label: 'Cocina', icon: ChefHat },
  { id: 'cashier', label: 'Caja', icon: DollarSign },
  { id: 'cash-register', label: 'Reg. Caja', icon: Wallet },
  { id: 'invoicing', label: 'Facturación', icon: FileText },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

export function BottomNav() {
  const user = useAppStore((s) => s.user)
  const currentSaleTotal = useAppStore((s) => s.currentSaleTotal)
  const { activeModule, setActiveModule } = useNavigationStore()
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

  const permitted = navItems.filter(
    (item) => user && (roleAccess[item.id] || ['admin']).includes(user.role)
  )

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between px-4 py-1.5 bg-card border-t border-border/50">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[7px] font-bold text-primary">{user?.first_name?.[0] || user?.username?.[0] || '?'}</span>
            </div>
            <div className="leading-none">
              <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-[0.06em] block">CAJERO</span>
              <span className="text-[10px] font-bold text-foreground truncate max-w-[70px] block leading-tight">{user?.first_name || user?.username}</span>
            </div>
          </div>
          <span className="w-px h-6 bg-border/60 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <div className="leading-none">
              <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-[0.06em] block">VENTAS DE HOY</span>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block leading-tight">{formatCurrency(dashboardData?.ventas_hoy || 0)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-blue-500" />
            <div className="leading-none">
              <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-[0.06em] block">VENTA ACTUAL</span>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 tabular-nums block leading-tight">{formatCurrency(currentSaleTotal)}</span>
            </div>
          </div>
          <span className="w-px h-6 bg-border/60 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-violet-500" />
            <div className="leading-none">
              <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-[0.06em] block">VENTAS DEL MES</span>
              <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 tabular-nums block leading-tight">{formatCurrency(monthSales)}</span>
            </div>
          </div>
        </div>
      </div>
      <nav className="flex items-center justify-around h-14 border-t bg-background px-1">
        {permitted.map((item) => {
          const Icon = item.icon
          const isActive = activeModule === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-sm')} />
              <span className={cn(
                'text-[10px] font-medium truncate w-full text-center leading-tight',
                isActive ? 'opacity-100' : 'opacity-70'
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
