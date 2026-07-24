import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { FileText, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, Send, Loader2, Download } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CardSkeleton } from '@/components/ui/skeleton'

interface ECFDoc {
  id: string
  payment: string
  order_id: string
  table_number: string
  ncf: string
  ncf_type: string
  rnc_cliente: string
  razon_social_cliente: string
  status: string
  attempts: number
  last_error: string
  total: number
  created_at: string
  sent_at: string | null
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'outline' },
  processing: { label: 'Enviando', icon: Loader2, variant: 'outline' },
  sent: { label: 'Enviado', icon: Send, variant: 'secondary' },
  accepted: { label: 'Aceptado', icon: CheckCircle2, variant: 'default' },
  rejected: { label: 'Rechazado', icon: XCircle, variant: 'destructive' },
  failed: { label: 'Falló', icon: AlertCircle, variant: 'destructive' },
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <CardSkeleton className="h-5 w-24" />
          <CardSkeleton className="h-5 w-12" />
          <CardSkeleton className="h-5 w-28" />
          <CardSkeleton className="h-5 w-16" />
          <CardSkeleton className="h-5 w-20" />
          <CardSkeleton className="h-5 w-12" />
          <CardSkeleton className="h-5 flex-1" />
          <CardSkeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

export function InvoicingPage() {
  const [documents, setDocuments] = useState<ECFDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)

  const [annulModalOpen, setAnnulModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<ECFDoc | null>(null)
  const [annulReason, setAnnulReason] = useState('1')
  const [annulling, setAnnulling] = useState(false)

  const fetchDocs = async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api<{ count: number; results: ECFDoc[] }>('/billing/ecf-documents/?page_size=50')
      setDocuments(data.results)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  const handleRetry = async (id: string) => {
    setRetrying(id)
    await api(`/billing/ecf-documents/${id}/retry/`, { method: 'POST' })
    await fetchDocs()
    setRetrying(null)
  }

  const handleAnnul = async () => {
    if (!selectedDoc) return
    setAnnulling(true)
    try {
      const reasons: Record<string, string> = {
        '1': 'Anulación de Factura',
        '2': 'Corrección de Errores',
        '3': 'Descuento / Bonificación',
        '4': 'Devolución de Bienes',
      }
      await api(`/billing/payments/${selectedDoc.payment}/refund/`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reasons[annulReason] || 'Anulación de Factura',
        }),
      })
      setAnnulModalOpen(false)
      setSelectedDoc(null)
      await fetchDocs()
    } catch (err: any) {
      alert(err.message || 'Error al procesar el reembolso')
    }
    setAnnulling(false)
  }

  const hasCreditNote = (paymentId: string) => {
    return documents.some((d) => d.payment === paymentId && d.ncf_type === 'B04')
  }

  const stats = {
    total: documents.length,
    accepted: documents.filter(d => d.status === 'accepted').length,
    pending: documents.filter(d => d.status === 'pending').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed' || d.status === 'rejected').length,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facturación Electrónica</h2>
          <p className="text-sm text-muted-foreground">Documentos e-CF enviados a la DGII</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDocs} className="gap-2">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-6 pt-0 text-center"><p className="text-2xl font-bold tabular-nums">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card className="border-success/20"><CardContent className="p-6 pt-0 text-center"><p className="text-2xl font-bold text-success tabular-nums">{stats.accepted}</p><p className="text-xs text-muted-foreground">Aceptados</p></CardContent></Card>
          <Card className="border-warning/20"><CardContent className="p-6 pt-0 text-center"><p className="text-2xl font-bold text-warning tabular-nums">{stats.pending}</p><p className="text-xs text-muted-foreground">Pendientes</p></CardContent></Card>
          <Card className="border-primary/20"><CardContent className="p-6 pt-0 text-center"><p className="text-2xl font-bold text-primary tabular-nums">{stats.processing}</p><p className="text-xs text-muted-foreground">Enviando</p></CardContent></Card>
          <Card className="border-destructive/20"><CardContent className="p-6 pt-0 text-center"><p className="text-2xl font-bold text-destructive tabular-nums">{stats.failed}</p><p className="text-xs text-muted-foreground">Fallidos</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Reportes Fiscales DGII</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex items-center gap-3 flex-wrap">
            <select id="report-month" defaultValue={new Date().getMonth() + 1}
              className="bg-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
              ))}
            </select>
            <select id="report-year" defaultValue={new Date().getFullYear()}
              className="bg-input border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
              const m = (document.getElementById('report-month') as HTMLSelectElement)?.value
              const y = (document.getElementById('report-year') as HTMLSelectElement)?.value
              try {
                const res = await fetch(`/api/billing/ecf-documents/reporte_607/?year=${y}&month=${m}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                })
                if (!res.ok) throw new Error('Error al descargar')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `reporte_607_${y}_${m}.csv`; a.click()
                URL.revokeObjectURL(url)
              } catch (e) { alert('Error al descargar reporte 607') }
            }}>
              <Download className="w-3 h-3" /> 607 Ventas
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
              const m = (document.getElementById('report-month') as HTMLSelectElement)?.value
              const y = (document.getElementById('report-year') as HTMLSelectElement)?.value
              try {
                const res = await fetch(`/api/billing/ecf-documents/reporte_606/?year=${y}&month=${m}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                })
                if (!res.ok) throw new Error('Error al descargar')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `reporte_606_${y}_${m}.csv`; a.click()
                URL.revokeObjectURL(url)
              } catch (e) { alert('Error al descargar reporte 606') }
            }}>
              <Download className="w-3 h-3" /> 606 Compras
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Documentos e-CF</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <AlertCircle className="w-10 h-10 text-destructive/50 mb-3" />
              <p className="text-sm font-medium">Error al cargar documentos</p>
              <Button size="sm" variant="outline" onClick={fetchDocs} className="gap-1 mt-3">
                <RefreshCw className="w-3 h-3" /> Reintentar
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay documentos e-CF aún</p>
              <p className="text-xs">Los documentos se generan automáticamente al procesar un pago</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">NCF</th>
                    <th className="text-left p-3 font-medium">Mesa</th>
                    <th className="text-left p-3 font-medium">RNC</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Intentos</th>
                    <th className="text-left p-3 font-medium">Error</th>
                    <th className="text-right p-3 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, i) => {
                    const cfg = statusConfig[doc.status] || statusConfig.pending
                    const Icon = cfg.icon
                    return (
                      <motion.tr key={doc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{doc.ncf || '—'}</td>
                        <td className="p-3">{doc.table_number}</td>
                        <td className="p-3 font-mono text-xs">{doc.rnc_cliente || '—'}</td>
                        <td className="p-3 font-semibold tabular-nums">{formatCurrency(doc.total)}</td>
                        <td className="p-3">
                          <Badge variant={cfg.variant} className="gap-1 text-xs">
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground tabular-nums">{doc.attempts}</td>
                        <td className="p-3 text-xs text-destructive max-w-[200px] truncate">{doc.last_error || '—'}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(doc.status === 'failed' || doc.status === 'rejected') && (
                              <Button variant="outline" size="sm" className="text-xs"
                                onClick={() => handleRetry(doc.id)}
                                disabled={retrying === doc.id}>
                                {retrying === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Reintentar
                              </Button>
                            )}
                            {doc.ncf_type === 'B01' && doc.status === 'accepted' && !hasCreditNote(doc.payment) && (
                              <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                                onClick={() => {
                                  setSelectedDoc(doc)
                                  setAnnulModalOpen(true)
                                }}>
                                Anular
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={annulModalOpen} onClose={() => setAnnulModalOpen(false)} title="Anular Factura (Nota de Crédito)">
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground font-sans">
            Se generará una Nota de Crédito Electrónica (B04) asociada al NCF <span className="font-mono font-semibold">{selectedDoc?.ncf}</span>.
            Esta acción anulará la venta en los registros contables y liberará la mesa asociada.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground font-sans">Motivo de Anulación</label>
            <select value={annulReason} onChange={(e) => setAnnulReason(e.target.value)}
              className="w-full bg-input border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans">
              <option value="1">01 - Anulación de Factura</option>
              <option value="2">02 - Corrección de Errores</option>
              <option value="3">03 - Descuento / Bonificación</option>
              <option value="4">04 - Devolución de Bienes</option>
            </select>
          </div>

          <div className="flex items-center gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setAnnulModalOpen(false)} disabled={annulling}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleAnnul} disabled={annulling} className="gap-2">
              {annulling && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Anulación
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
