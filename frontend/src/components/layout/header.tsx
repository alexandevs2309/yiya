import { useNavigationStore } from '@/stores/navigation-store'
import { useAppStore } from '@/stores/app-store'
import { useThemeStore, applyTheme, applySolMode } from '@/stores/theme-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Sun, Moon, Bell, LogOut, ChevronDown, Menu,
  Wifi, WifiOff, SunMedium, User as UserIcon,
  Settings, Key, CheckCircle2, Clock, X, Info, AlertTriangle, Camera, Volume2, Globe, PenSquare
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { clearTokens, getOfflineQueue, api, adminApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications-store'
import { usePreferencesStore, TTS_VOICES } from '@/stores/preferences-store'

export function Header({ onToggleSidebar, hideMenuButton }: { onToggleSidebar?: () => void; hideMenuButton?: boolean }) {
  const { activeModule } = useNavigationStore()
  const { user, setUser } = useAppStore()
  const { theme, toggleTheme, solMode, toggleSolMode, setSolMode } = useThemeStore()
  
  // Force disable solMode if user is not a waiter
  useEffect(() => {
    if (user?.role && user.role !== 'waiter' && solMode) {
      setSolMode(false)
    }
  }, [user?.role, solMode, setSolMode])

  const setActiveModule = useNavigationStore((s) => s.setActiveModule)

  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false)
  const { notifications: allNotifications, markAsRead } = useNotificationsStore()
  
  const notifications = allNotifications.filter(n => {
    if (n.targetUserId && user?.id && n.targetUserId !== String(user.id)) return false;
    if (n.targetRoles && user?.role && !n.targetRoles.includes(user.role)) return false;
    return true;
  })
  const unread = notifications.filter(n => !n.read).length

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => markAsRead(n.id))
  }
  
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '', phone: '', avatar: null as File | null })
  useEffect(() => {
    if (profileModalOpen && user) {
      setProfileForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, avatar: null })
    }
  }, [profileModalOpen, user])

  const handleSaveProfile = async () => {
    if (!user) return
    try {
      let payload: any = { 
        first_name: profileForm.first_name, 
        last_name: profileForm.last_name, 
        email: profileForm.email, 
        phone: profileForm.phone 
      }
      if (profileForm.avatar) {
        const formData = new FormData()
        formData.append('first_name', profileForm.first_name)
        formData.append('last_name', profileForm.last_name)
        formData.append('email', profileForm.email)
        formData.append('phone', profileForm.phone)
        formData.append('avatar', profileForm.avatar)
        payload = formData
      }
      const updated = await adminApi.users.update(user.id, payload)
      setUser(updated)
      setProfileModalOpen(false)
    } catch (e) {
      alert('Error al guardar el perfil')
    }
  }

  const { soundEnabled, language, setSoundEnabled, setLanguage, ttsVoice, setTTSVoice, navigationMode, setNavigationMode } = usePreferencesStore()
  
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  
  // Network status
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { applySolMode(solMode) }, [solMode])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    const handleQueueChange = async () => setQueueCount((await getOfflineQueue()).length)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-queue-changed', handleQueueChange)
    handleQueueChange()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-queue-changed', handleQueueChange)
    }
  }, [])

  const handleLogout = () => {
    clearTokens()
    setUser(null)
  }

  const moduleNames: Record<string, string> = {
    dashboard: 'Dashboard',
    'floor-plan': 'Plano de Mesas',
    pos: 'Punto de Venta',
    kds: 'Cocina (KDS)',
    cashier: 'Caja',
    invoicing: 'Facturación Electrónica',
    inventory: 'Inventario',
    customers: 'Clientes',
    reports: 'Reportes',
    settings: 'Configuración',
  }

  return (
    <>
      <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-xl border-b sticky top-0 z-40 transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        {!hideMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full w-9 h-9 shrink-0"
            title="Menú"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <motion.h1
          key={activeModule}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold tracking-tight truncate font-heading"
        >
          {moduleNames[activeModule] || activeModule}
        </motion.h1>
      </div>

      <div className="flex items-center gap-3">
        
        {/* Direct Toggles */}
        {user?.role === 'waiter' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSolMode}
            className={cn(
              "relative text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full w-9 h-9 transition-colors",
              solMode && "text-accent"
            )}
            title="Modo Sol (Exteriores)"
          >
            <SunMedium className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full w-9 h-9 transition-colors"
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "relative text-muted-foreground hover:text-foreground rounded-full w-9 h-9 transition-colors",
              notificationsOpen ? "bg-secondary/50" : "hover:bg-secondary/50"
            )}
            title="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-destructive rounded-full ring-2 ring-background" />}
          </Button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl border bg-card/95 backdrop-blur-xl p-0 shadow-xl z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                  {unread > 0 && <Badge variant="secondary" className="text-[10px]">{unread} Nuevas</Badge>}
                </div>
                <div className="max-h-[300px] overflow-auto">
                  {notifications.length === 0 ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">Sin notificaciones</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => markAsRead(n.id)} className={cn("p-3 transition-colors cursor-pointer border-b border-border/50", n.read ? "opacity-60 hover:bg-muted/10" : "hover:bg-muted/30 bg-muted/5")}>
                        <div className="flex gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", n.type === 'success' ? 'bg-success/20' : n.type === 'warning' ? 'bg-warning/20' : n.type === 'error' ? 'bg-destructive/20' : 'bg-primary/20')}>
                            {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-success" /> : n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-warning" /> : n.type === 'error' ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Info className="w-4 h-4 text-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(n.time).toLocaleTimeString('es-DO', {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-border bg-muted/10 text-center">
                  <Button variant="link" size="sm" onClick={handleMarkAllAsRead} className="text-xs font-medium text-primary hover:underline h-auto py-1">Marcar todas como leídas</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="relative" ref={userDropdownRef}>
            <Button
              variant="ghost"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className={cn(
                "flex items-center gap-3 pl-2 pr-3 py-1.5 h-auto rounded-full border border-transparent transition-all",
                userDropdownOpen ? "bg-secondary/50 border-border" : "hover:bg-secondary/30"
              )}
            >
              <div className="relative">
                <Avatar className="w-8 h-8 rounded-full ring-2 ring-background">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                      {user.first_name?.[0] || user.username[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Network indicator dot */}
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
                  online ? (queueCount > 0 ? "bg-warning animate-pulse" : "bg-success") : "bg-destructive"
                )} />
              </div>
              
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold leading-tight">{user.first_name || user.username}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user.role}</p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200 ml-1',
                  userDropdownOpen && 'rotate-180'
                )}
              />
            </Button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border bg-card/95 backdrop-blur-xl p-2 shadow-xl z-50"
                >
                  <div className="px-3 py-3 mb-2 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mb-2">{user.email}</p>
                    
                    <div className="flex items-center gap-1.5">
                      <Badge variant={online ? "success" : "destructive"} className="text-[9px] px-1.5 py-0">
                        {online ? 'Online' : 'Offline'}
                      </Badge>
                      {queueCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">({queueCount} pend.)</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-2 space-y-1">
                    <Button 
                      variant="ghost"
                      onClick={() => { setProfileModalOpen(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center justify-start gap-2.5 px-2 py-2 text-sm rounded-lg text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      Mi Perfil
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => { setPasswordModalOpen(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center justify-start gap-2.5 px-2 py-2 text-sm rounded-lg text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-left">Cambiar Contraseña</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => { setPreferencesModalOpen(true); setUserDropdownOpen(false); }}
                      className="w-full flex items-center justify-start gap-2.5 px-2 py-2 text-sm rounded-lg text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Mis Preferencias
                    </Button>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/50 px-2">
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-start gap-2.5 px-2 py-2 text-sm rounded-lg text-destructive font-medium hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.header>

      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Cambiar Contraseña</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPasswordModalOpen(false)} className="text-muted-foreground hover:text-foreground w-8 h-8">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contraseña Actual</label>
                  <input type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nueva Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmar Nueva Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setPasswordModalOpen(false)}>Cancelar</Button>
                <Button onClick={() => setPasswordModalOpen(false)} className="bg-primary text-primary-foreground hover:brightness-110">
                  Actualizar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-success" />
                  </div>
                  <h3 className="font-semibold text-lg">Mi Perfil</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setProfileModalOpen(false)} className="text-muted-foreground hover:text-foreground w-8 h-8">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 rounded-full ring-4 ring-background shadow-md">
                      {profileForm.avatar ? (
                        <img src={URL.createObjectURL(profileForm.avatar)} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                      ) : user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                          {user?.first_name?.[0] || user?.username?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label className="absolute bottom-0 right-0 bg-secondary text-foreground p-1.5 rounded-full shadow-md hover:bg-secondary/80 transition-colors border cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setProfileForm({ ...profileForm, avatar: e.target.files[0] })
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</label>
                      <input type="text" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apellido</label>
                      <input type="text" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Electrónico</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teléfono</label>
                  <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+1 (809) 000-0000" className="w-full h-10 px-3 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setProfileModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveProfile} className="bg-primary text-primary-foreground hover:brightness-110">
                  Guardar Cambios
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {preferencesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg">Mis Preferencias</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPreferencesModalOpen(false)} className="text-muted-foreground hover:text-foreground w-8 h-8">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-2 space-y-1">
                <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Sonido de notificaciones</p>
                      <p className="text-[10px] text-muted-foreground">Emitir un sonido corto al recibir una alerta</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Idioma Preferido</p>
                      <p className="text-[10px] text-muted-foreground">Seleccionar el idioma de la interfaz</p>
                    </div>
                  </div>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="h-8 rounded-lg bg-input border border-border text-xs px-2 focus:outline-none">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Voz de anuncios</p>
                      <p className="text-[10px] text-muted-foreground">Voz para anuncios por altavoz</p>
                    </div>
                  </div>
                  <select value={ttsVoice} onChange={e => setTTSVoice(e.target.value as any)} className="h-8 rounded-lg bg-input border border-border text-xs px-2 focus:outline-none">
                    {TTS_VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Menu className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Navegación</p>
                      <p className="text-[10px] text-muted-foreground">Menú lateral o barra inferior</p>
                    </div>
                  </div>
                  <select value={navigationMode} onChange={e => setNavigationMode(e.target.value as any)} className="h-8 rounded-lg bg-input border border-border text-xs px-2 focus:outline-none">
                    <option value="sidebar">Sidebar</option>
                    <option value="bottom">Barra inferior</option>
                  </select>
                </label>
              </div>
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-end mt-2">
                <Button onClick={() => setPreferencesModalOpen(false)} className="bg-primary text-primary-foreground hover:brightness-110 w-full">
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
