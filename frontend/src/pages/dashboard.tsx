import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dashboardApi, type DashboardData } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { motion } from 'framer-motion'
import {
  DollarSign, Users, ChefHat, Receipt, FileText,
  TrendingUp, Clock, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { BarChart } from '@/components/charts'
import { CardSkeleton } from '@/components/ui/skeleton'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week'>('today')

  useEffect(() => {
    let mounted = true
    const doFetch = async (bg = false) => {
      if (!bg) setLoading(true)
      setError(false)
      try {
        const today = new Date()
        let start, end;
        if (dateFilter === 'today') {
          start = new Date(today.setHours(0,0,0,0)).toISOString().split('T')[0]
          end = new Date(today.setHours(23,59,59,999)).toISOString().split('T')[0]
        } else if (dateFilter === 'yesterday') {
          const yest = new Date(new Date().setDate(new Date().getDate() - 1))
          start = new Date(yest.setHours(0,0,0,0)).toISOString().split('T')[0]
          end = new Date(yest.setHours(23,59,59,999)).toISOString().split('T')[0]
        } else if (dateFilter === 'week') {
          const week = new Date(new Date().setDate(new Date().getDate() - 7))
          start = new Date(week.setHours(0,0,0,0)).toISOString().split('T')[0]
          end = new Date(new Date().setHours(23,59,59,999)).toISOString().split('T')[0]
        }
        const d = await dashboardApi.get(start, end)
        if (mounted) setData(d)
      } catch {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    doFetch()
    const interval = setInterval(() => doFetch(true), 30000) // Auto-refresh cada 30s
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [dateFilter])

  const user = useAppStore((s) => s.user)
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const ocupacion = data ? Math.round((data.mesas_ocupadas / data.total_mesas) * 100) : 0

  const metrics = [
    { label: 'Ventas Hoy', value: formatCurrency(data?.ventas_hoy || 0), icon: DollarSign },
    { label: 'ITBIS (18%)', value: formatCurrency(data?.itbis_hoy || 0), icon: Receipt },
    { label: 'Propina (10%)', value: formatCurrency(data?.propina_hoy || 0), icon: TrendingUp },
    { label: 'Ticket Promedio', value: formatCurrency(data?.ticket_promedio || 0), icon: Clock },
    { label: 'Mesas Ocupadas', value: `${data?.mesas_ocupadas ?? 0}/${data?.total_mesas ?? 0}`, icon: Users, badge: `${ocupacion}%` },
    { label: 'En Cocina', value: String(data?.ordenes_en_cocina ?? 0), icon: ChefHat },
    { label: 'Transacciones Hoy', value: String(data?.total_transacciones ?? 0), icon: FileText },
    { label: 'e-CF Pendientes', value: String(data?.ecf_pendientes ?? 0), icon: AlertTriangle },
  ]

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Error al cargar</h2>
          <p className="text-sm text-muted-foreground mb-4">No se pudieron obtener los datos del dashboard</p>
          <Button onClick={() => setDateFilter(dateFilter)} className="gap-2" size="sm">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {saludo}, {user?.first_name || 'Usuario'}
          </h2>
          <p className="text-sm text-muted-foreground">Resumen de operaciones {dateFilter === 'today' ? 'de hoy' : dateFilter === 'yesterday' ? 'de ayer' : 'de los últimos 7 días'}</p>
        </div>
        
        <div className="flex bg-secondary/30 p-1 rounded-lg w-max shrink-0">
          <Button variant="ghost" onClick={() => setDateFilter('today')} className={`h-8 px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${dateFilter === 'today' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}>Hoy</Button>
          <Button variant="ghost" onClick={() => setDateFilter('yesterday')} className={`h-8 px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${dateFilter === 'yesterday' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}>Ayer</Button>
          <Button variant="ghost" onClick={() => setDateFilter('week')} className={`h-8 px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${dateFilter === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}>7 Días</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon
            return (
              <motion.div key={m.label} variants={itemAnim}>
                <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    {m.badge && (
                      <Badge variant="secondary" className="mt-2 text-xs">{m.badge} ocupación</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && !data ? (
          <CardSkeleton className="h-64 lg:col-span-2" />
        ) : (data?.hourly_orders && data.hourly_orders.length > 0) && (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 pt-0">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Órdenes por Hora</h3>
              </div>
              <BarChart
                data={data.hourly_orders}
                labelKey="hour"
                series={[{ key: 'orders', name: 'Órdenes' }]}
                height={200}
                labelFormatter={(h) => `${h}:00`}
                tooltipFormatter={(v) => [`${v ?? 0} órdenes`, 'Cantidad']}
                showLegend={false}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Métodos de Pago</h3>
            </div>
            <div className="space-y-4">
              {(() => {
                const totalPagos = data?.payment_methods ? (data.payment_methods.efectivo + data.payment_methods.tarjeta + data.payment_methods.transferencia + data.payment_methods.yape) : 0;
                if (totalPagos === 0) return <p className="text-sm text-muted-foreground">No hay pagos registrados</p>;
                return [
                  { label: 'Efectivo', value: data?.payment_methods.efectivo || 0, color: 'bg-success' },
                  { label: 'Tarjeta', value: data?.payment_methods.tarjeta || 0, color: 'bg-primary' },
                  { label: 'Transferencia', value: data?.payment_methods.transferencia || 0, color: 'bg-warning' },
                ].map(pm => {
                  const pct = totalPagos > 0 ? Math.round((pm.value / totalPagos) * 100) : 0
                  return (
                    <div key={pm.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{pm.label}</span>
                        <span className="font-medium">{formatCurrency(pm.value)} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div className={`h-full ${pm.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Platos Más Vendidos</h3>
            </div>
            <div className="space-y-3">
              {data?.top_items?.length === 0 && <p className="text-sm text-muted-foreground">No hay ventas en este período</p>}
              {data?.top_items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm tabular-nums bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">{item.quantity} und.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Rendimiento Meseros</h3>
            </div>
            <div className="space-y-3">
              {data?.top_waiters?.length === 0 && <p className="text-sm text-muted-foreground">No hay órdenes registradas</p>}
              {data?.top_waiters?.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-sm font-medium">{w.name}</span>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">{w.orders} órdenes</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Actividad Reciente</h3>
            </div>
            <div className="space-y-2">
              {(data?.activity.length ?? 0) === 0 && (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 text-muted-foreground/20 mb-2" />
                  <p className="text-sm font-medium">Sin actividad</p>
                </div>
              )}
              {data?.activity.map((a, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 text-sm transition-colors">
                  {a.type === 'order' ? (
                    <ChefHat className="w-4 h-4 text-warning shrink-0" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-success shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {new Date(a.time).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {data && data.ecf_fallidos > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-6 pt-0 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{data.ecf_fallidos} documento(s) e-CF requieren atención</p>
                <p className="text-xs text-muted-foreground">Revisa la sección de Facturación para reintentarlos</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
