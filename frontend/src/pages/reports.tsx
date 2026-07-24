import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { dashboardApi, type DashboardData } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { BarChart, PieChart } from '@/components/charts'
import { DollarSign, ChefHat, AlertTriangle, Download, RefreshCw, TrendingUp, Clock, AlertCircle, BarChart3 } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/skeleton'

export function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetch = async () => {
    setLoading(true)
    setError(false)
    try {
      const d = await dashboardApi.get()
      setData(d)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleExport = () => {
    if (!data) return
    const lines = [
      `Reporte D'Yiya Restaurant - ${new Date().toLocaleDateString('es-DO')}`,
      '',
      'Métrica,Valor',
      `Ventas Hoy,${data.ventas_hoy}`,
      `ITBIS (18%),${data.itbis_hoy}`,
      `Propina (10%),${data.propina_hoy}`,
      `Ticket Promedio,${data.ticket_promedio}`,
      `Transacciones,${data.total_transacciones}`,
      `Mesas Ocupadas,${data.mesas_ocupadas}/${data.total_mesas}`,
      `Órdenes en Cocina,${data.ordenes_en_cocina}`,
      `e-CF Pendientes,${data.ecf_pendientes}`,
      `e-CF Fallidos,${data.ecf_fallidos}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `reporte-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Error al cargar reportes</h2>
          <p className="text-sm text-muted-foreground mb-4">No se pudieron obtener los datos</p>
          <Button onClick={fetch} className="gap-2" size="sm">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const ocupacion = data ? Math.round((data.mesas_ocupadas / data.total_mesas) * 100) : 0

  const paymentMethods = data?.payment_methods
    ? [
        { name: 'Efectivo', value: data.payment_methods.efectivo },
        { name: 'Tarjeta', value: data.payment_methods.tarjeta },
        { name: 'Transferencia', value: data.payment_methods.transferencia },
        { name: 'Yape', value: data.payment_methods.yape },
      ]
    : [
        { name: 'Efectivo', value: 0 },
        { name: 'Tarjeta', value: 0 },
        { name: 'Transferencia', value: 0 },
        { name: 'Yape', value: 0 },
      ]

  const hasHourlyData = data?.hourly_orders && data.hourly_orders.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetch} variant="outline" className="gap-1"><RefreshCw className="w-3 h-3" /> Actualizar</Button>
          <Button size="sm" onClick={handleExport} variant="outline" className="gap-1" disabled={!data}><Download className="w-3 h-3" /> Exportar CSV</Button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton className="h-72" />
            <CardSkeleton className="h-72" />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">Ventas Hoy</p><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data?.ventas_hoy || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">ITBIS</p><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data?.itbis_hoy || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">Propina</p><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data?.propina_hoy || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">Ticket Promedio</p><p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data?.ticket_promedio || 0)}</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">Transacciones</p><p className="text-2xl font-bold text-foreground tabular-nums">{data?.total_transacciones || 0}</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">Ocupación</p><p className="text-2xl font-bold text-foreground tabular-nums">{ocupacion}%</p><p className="text-xs text-muted-foreground">{data?.mesas_ocupadas || 0}/{data?.total_mesas || 0} mesas</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">En Cocina</p><p className="text-2xl font-bold text-foreground tabular-nums">{data?.ordenes_en_cocina || 0}</p></CardContent></Card>
            <Card><CardContent className="p-6 pt-0"><p className="text-xs text-muted-foreground">e-CF Pendientes</p><p className="text-2xl font-bold text-foreground tabular-nums">{data?.ecf_pendientes || 0}</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 pt-0">
                <h3 className="text-sm font-semibold mb-4">Órdenes por Hora</h3>
                {hasHourlyData ? (
                  <BarChart
                    data={data.hourly_orders}
                    labelKey="hour"
                    series={[{ key: 'orders', name: 'Órdenes' }]}
                    height={250}
                    labelFormatter={(h) => `${h}:00`}
                    tooltipFormatter={(v) => [`${v ?? 0} órdenes`, 'Cantidad']}
                    showLegend={false}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                    <BarChart3 className="w-8 h-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm font-medium">Sin datos de órdenes hoy</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Las ventas aparecerán aquí</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 pt-0">
                <h3 className="text-sm font-semibold mb-4">Métodos de Pago</h3>
                <PieChart
                  data={paymentMethods}
                  nameKey="name"
                  valueKey="value"
                  innerRadius={60}
                  outerRadius={90}
                  height={250}
                  tooltipFormatter={(v) => [`${v}%`, 'Distribución']}
                  showLegend={true}
                  legendLayout="vertical"
                  animationDuration={800}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6 pt-0">
              <h3 className="text-sm font-semibold mb-3">Actividad Reciente</h3>
              <div className="space-y-2">
                {(data?.activity.length ?? 0) === 0 && (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm font-medium">Sin actividad hoy</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Las acciones del día aparecerán aquí</p>
                  </div>
                )}
                {data?.activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 text-sm transition-colors">
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {data && data.ecf_fallidos > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-destructive/30 bg-destructive/5">
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
        </>
      )}
    </motion.div>
  )
}
