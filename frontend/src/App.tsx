import { useEffect, lazy, Suspense, useState, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import type { UserRole } from '@/types'
import { useNavigationStore } from '@/stores/navigation-store'
import { useThemeStore, applyTheme } from '@/stores/theme-store'
import { usePreferencesStore } from '@/stores/preferences-store'
import { LoginPage } from '@/pages/login'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Modal } from '@/components/ui/modal'
import { motion, AnimatePresence } from 'framer-motion'
import { ToastContainer } from '@/components/ui/toast'
import { useWaiterNotifications } from '@/hooks/use-waiter-notifications'
import { Lock, Loader2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, clearTokens } from '@/services/api'
import { initBackgroundAudio } from '@/lib/sound'

const FloorPlanPage = lazy(() => import('@/pages/floor-plan').then(m => ({ default: m.FloorPlanPage })))
const POSPage = lazy(() => import('@/pages/pos').then(m => ({ default: m.POSPage })))
const KDSPage = lazy(() => import('@/pages/kds').then(m => ({ default: m.KDSPage })))
const CashierPage = lazy(() => import('@/pages/cashier').then(m => ({ default: m.CashierPage })))
const InvoicingPage = lazy(() => import('@/pages/invoicing').then(m => ({ default: m.InvoicingPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.DashboardPage })))
const SettingsPage = lazy(() => import('@/pages/settings').then(m => ({ default: m.SettingsPage })))
const InventoryPage = lazy(() => import('@/pages/inventory').then(m => ({ default: m.InventoryPage })))
const CustomersPage = lazy(() => import('@/pages/customers').then(m => ({ default: m.CustomersPage })))
const ReportsPage = lazy(() => import('@/pages/reports').then(m => ({ default: m.ReportsPage })))
const CashRegisterPage = lazy(() => import('@/pages/cash-register').then(m => ({ default: m.CashRegisterPage })))

const pages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: DashboardPage,
  'floor-plan': FloorPlanPage,
  pos: POSPage,
  kds: KDSPage,
  cashier: CashierPage,
  invoicing: InvoicingPage,
  settings: SettingsPage,
  inventory: InventoryPage,
  customers: CustomersPage,
  reports: ReportsPage,
  'cash-register': CashRegisterPage,
}

export const roleAccess: Record<string, UserRole[]> = {
  dashboard: ['admin'],
  'floor-plan': ['admin', 'cashier', 'waiter'],
  pos: ['admin', 'cashier', 'waiter'],
  kds: ['admin', 'cook'],
  cashier: ['admin', 'cashier'],
  invoicing: ['admin', 'cashier'],
  settings: ['admin'],
  inventory: ['admin'],
  customers: ['admin', 'cashier'],
  reports: ['admin'],
  'cash-register': ['admin', 'cashier'],
}

const defaultModuleForRole: Record<UserRole, string> = {
  admin: 'dashboard',
  cashier: 'cashier',
  waiter: 'floor-plan',
  cook: 'kds',
}

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function KioskExitModal({ open, onClose, onConfirm, onLogout }: { open: boolean; onClose: () => void; onConfirm: (pin: string) => Promise<void>; onLogout: () => void }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await onConfirm(pin)
      setPin('')
    } catch (e: any) {
      setError(e?.message || 'PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Salir del modo kiosko">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Ingresa el PIN de un administrador para desbloquear.</p>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">PIN de Administrador</label>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} placeholder="••••"
            className="w-full h-10 rounded-lg bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={loading || pin.length < 4}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desbloquear'}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-destructive hover:text-destructive/80 text-xs gap-1.5">
            <LogOut className="w-3 h-3" /> Cerrar sesión
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function POSLayout() {
  const user = useAppStore((s) => s.user)
  const { kioskMode, setKioskMode } = useAppStore()
  const { activeModule, setActiveModule } = useNavigationStore()
  const { theme } = useThemeStore()
  const navigationMode = usePreferencesStore((s) => s.navigationMode)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [kioskExitOpen, setKioskExitOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  useWaiterNotifications()

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const allowedRoles = roleAccess[activeModule] || ['admin']
  const hasAccess = user && allowedRoles.includes(user.role)

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const handler = () => { initBackgroundAudio(); document.removeEventListener('click', handler); document.removeEventListener('touchstart', handler) }
    document.addEventListener('click', handler, { once: true })
    document.addEventListener('touchstart', handler, { once: true })
    return () => { document.removeEventListener('click', handler); document.removeEventListener('touchstart', handler) }
  }, [])

  useEffect(() => {
    if (user && !hasAccess) {
      setActiveModule(defaultModuleForRole[user.role] as any)
      return
    }
    const path = activeModule === 'dashboard' ? '/' : `/${activeModule}`
    window.history.replaceState(null, '', path)
  }, [activeModule, user, hasAccess, setActiveModule])

  // Kiosk mode: fullscreen on enter, exit on leave
  useEffect(() => {
    if (kioskMode) {
      const el = document.documentElement
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [kioskMode])

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [activeModule])

  const handleKioskExit = useCallback(async (pin: string) => {
    const data = await api<{ valid: boolean }>('/auth/users/verify-admin-pin/', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    })
    if (!data.valid) throw new Error('PIN incorrecto')
    setKioskMode(false)
    setKioskExitOpen(false)
  }, [setKioskMode])

  const handleLogout = useCallback(() => {
    clearTokens()
    useAppStore.getState().setUser(null!)
    window.location.reload()
  }, [])

  if (!hasAccess) return <PageLoader />

  const Page = pages[activeModule]

  return (
    <div className={cn('flex h-screen overflow-hidden', navigationMode === 'bottom' && !isMobile && 'flex-col')}>
      {!kioskMode && (navigationMode === 'sidebar' || isMobile) && (
        <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      )}
      <ToastContainer />
      <div className={cn('flex-1 flex flex-col min-w-0', navigationMode === 'bottom' && !isMobile && 'h-full')}>
        {!kioskMode && (
          <Header
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            hideMenuButton={navigationMode === 'bottom' && !isMobile}
          />
        )}
        <main className="flex-1 overflow-auto relative">
          {kioskMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setKioskExitOpen(true)}
              className="absolute top-3 right-3 z-50 w-8 h-8 text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/30 rounded-full"
              title="Salir del modo kiosko"
            >
              <Lock className="w-4 h-4" />
            </Button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <Suspense fallback={<PageLoader />}>
                {Page ? <Page /> : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p className="text-lg">{activeModule} — Próximamente</p>
                  </div>
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        {!kioskMode && navigationMode === 'bottom' && !isMobile && <BottomNav />}
      </div>
      <KioskExitModal open={kioskExitOpen} onClose={() => setKioskExitOpen(false)} onConfirm={handleKioskExit} onLogout={handleLogout} />
    </div>
  )
}

export default function App() {
  const user = useAppStore((s) => s.user)

  if (!user) return <LoginPage />

  return <POSLayout />
}
