import { forwardRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { ReceiptData } from '@/services/api'

export const Receipt = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const fecha = new Date(data.fecha).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div ref={ref} className="receipt">
      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { -webkit-print-color-adjust: exact; }
        }
        .receipt {
          font-family: var(--font-receipt, 'Courier New', monospace);
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: 72mm;
          padding: 2mm 3mm;
          margin: 0 auto;
        }
        .receipt h1 { font-size: 16px; text-align: center; margin: 0 0 2px; font-weight: bold; }
        .receipt .sub { text-align: center; font-size: 10px; color: #555; margin-bottom: 4px; }
        .receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .receipt .row { display: flex; justify-content: space-between; font-size: 11px; }
        .receipt .item-name { font-size: 11px; }
        .receipt .mods { font-size: 10px; color: #666; padding-left: 4px; }
        .receipt .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
        .receipt .footer { text-align: center; font-size: 10px; color: #555; margin-top: 4px; }
        .receipt .thanks { text-align: center; font-size: 11px; margin-top: 6px; font-weight: bold; }
      `}</style>
      <h1>{data.restaurant}</h1>
      <div className="sub">{data.direccion}</div>
      <div className="sub">RNC: {data.rnc}</div>
      {data.ncf && <div className="sub">NCF: {data.ncf}</div>}
      <div className="divider" />
      <div className="row"><span>Mesa</span><span>{data.mesa}</span></div>
      <div className="row"><span>Mesero</span><span>{data.mesero}</span></div>
      <div className="row"><span>Método</span><span>{data.metodo_pago}</span></div>
      <div className="row"><span>Fecha</span><span>{fecha}</span></div>
      <div className="divider" />
      {data.items.map((item, i) => (
        <div key={i}>
          <div className="row">
            <span className="item-name">{item.cantidad}x {item.nombre}</span>
            <span>{formatCurrency(item.total)}</span>
          </div>
          {item.modificadores.length > 0 && (
            <div className="mods">+ {item.modificadores.join(', ')}</div>
          )}
        </div>
      ))}
      <div className="divider" />
      <div className="row"><span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span></div>
      <div className="row"><span>ITBIS (18%)</span><span>{formatCurrency(data.itbis)}</span></div>
      <div className="row"><span>Propina (10%)</span><span>{formatCurrency(data.propina)}</span></div>
      <div className="divider" />
      <div className="total-row"><span>TOTAL</span><span>{formatCurrency(data.total)}</span></div>
      {data.efectivo !== null && (
        <>
          <div className="row" style={{ marginTop: 4 }}><span>Efectivo</span><span>{formatCurrency(data.efectivo)}</span></div>
          {data.cambio !== null && data.cambio > 0 && (
            <div className="row"><span>Cambio</span><span>{formatCurrency(data.cambio)}</span></div>
          )}
        </>
      )}
      <div className="divider" />
      <div className="thanks">¡Gracias por su visita!</div>
      <div className="footer">Samaná, República Dominicana</div>
    </div>
  )
})

Receipt.displayName = 'Receipt'
