import type { Order, CashRegister } from "@/lib/types";
import { formatRD } from "./utils";
import { useSettingsStore } from "@/stores/settings.store";

// ── Thermal print ESC/POS helpers ──

function getBusinessName(): string {
  try {
    const saved = localStorage.getItem("diyiya_restaurant");
    if (saved) {
      const data = JSON.parse(saved);
      return data.name || "D' Yiya Samaná";
    }
  } catch {}
  return "D' Yiya Samaná";
}

// ── Print order ticket (kitchen / customer handoff) ──

export function printOrderTicket(order: {
  tableNumber: string | number;
  items: Array<{ qty: number; name: string; notes?: string; modifiers?: string }>;
  waitressName?: string;
  type?: "kitchen" | "bar" | "customer";
}) {
  const businessName = getBusinessName();
  const now = new Date().toLocaleString();
  const label = order.type === "kitchen" ? "COMANDADA DE COCINA" :
                order.type === "bar" ? "COMANDADA DE BARRA" :
                "TICKET DE ORDEN";

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td class="qty">${item.qty}x</td>
        <td class="name">${item.name}${item.modifiers ? `<br/><span class="mod">${item.modifiers}</span>` : ""}${item.notes ? `<br/><span class="note">📝 ${item.notes}</span>` : ""}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${label} Mesa ${order.tableNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { width: 76mm; margin: 0 auto; padding: 3mm 2mm; font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .header { margin-bottom: 4mm; }
        .header h1 { font-size: 16px; margin: 0 0 2px; }
        .header p { margin: 1px 0; font-size: 10px; }
        .divider { border-top: 1px dashed #000; margin: 3mm 0; }
        .table-num { font-size: 22px; font-weight: bold; text-align: center; margin: 3mm 0; letter-spacing: 2px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
        .items-table td { padding: 3px 0; vertical-align: top; }
        .qty { width: 12%; }
        .name { width: 88%; }
        .mod { font-size: 9px; color: #555; }
        .note { font-size: 9px; color: #888; font-style: italic; }
        .footer { margin-top: 4mm; font-size: 9px; text-align: center; border-top: 1px dashed #000; padding-top: 2mm; }
        .cut { page-break-after: always; }
      </style>
    </head>
    <body>
      <div class="header text-center">
        <h1>${businessName}</h1>
        <p>${label}</p>
        <p>${now}</p>
        ${order.waitressName ? `<p>Mesera: ${order.waitressName}</p>` : ""}
      </div>

      <div class="table-num">MESA ${order.tableNumber}</div>

      <div class="divider"></div>

      <table class="items-table">
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="footer">
        <p class="bold">¡Buen provecho!</p>
        <p>D' Yiya Restaurante · Samaná</p>
      </div>
    </body>
    </html>
  `;

  printHTML(html);
}

// ── Print simple text ticket (general purpose) ──

export function printTicket(content: { title: string; lines: Array<{ label: string; value: string }>; footer?: string }) {
  const businessName = getBusinessName();
  const now = new Date().toLocaleString();

  const linesHtml = content.lines
    .map(
      (l) => `
      <tr>
        <td>${l.label}</td>
        <td class="text-right bold">${l.value}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${content.title}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { width: 76mm; margin: 0 auto; padding: 3mm 2mm; font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .header { margin-bottom: 4mm; text-align: center; }
        .header h1 { font-size: 14px; margin: 0 0 2px; }
        .header p { margin: 1px 0; font-size: 9px; }
        .divider { border-top: 1px dashed #000; margin: 3mm 0; }
        .lines-table { width: 100%; }
        .lines-table td { padding: 2px 0; }
        .footer { margin-top: 4mm; font-size: 9px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${businessName}</h1>
        <p>${content.title}</p>
        <p>${now}</p>
      </div>
      <div class="divider"></div>
      <table class="lines-table">${linesHtml}</table>
      ${content.footer ? `<div class="divider"></div><div class="footer">${content.footer}</div>` : ""}
    </body>
    </html>
  `;

  printHTML(html);
}

function printHTML(content: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(content);
    doc.close();

    // Wait a brief moment to ensure layout is parsed, then print and clean up
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }
}

export function printReceipt(order: Order) {
  const itbisRate = useSettingsStore.getState().settings.itbisRate || 18;
  const propinaRate = useSettingsStore.getState().settings.propinaRate || 10;
  const isFiscal = !!order.rnc;
  const ecf = order.ecf_document;
  const ncf = ecf?.ecf_number || order.receipt_number || "—";
  const dateStr = order.closed_at
    ? new Date(order.closed_at).toLocaleString()
    : new Date().toLocaleString();

  const subtotal = parseFloat((order.subtotal || 0).toString());
  const itbis = parseFloat((order.itbis || 0).toString());
  const tip = parseFloat((order.tip || 0).toString());
  const total = parseFloat((order.total || 0).toString());

  const qrUrl = ecf?.qr_code || "";
  const qrImageHtml = qrUrl
    ? `<div class="qr-container">
         <img src="https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(qrUrl)}&chld=L|1" alt="QR DGII" />
         <p class="qr-text">Consulte en DGII</p>
       </div>`
    : "";

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td class="qty">${item.quantity}x</td>
        <td class="name">${item.name}</td>
        <td class="price">${formatRD(parseFloat(item.unit_price.toString()))}</td>
        <td class="total">${formatRD(parseFloat(item.unit_price.toString()) * item.quantity)}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket ${ncf}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          width: 76mm;
          margin: 0 auto;
          padding: 4mm 2mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          background-color: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .header {
          margin-bottom: 5mm;
        }
        .header h1 {
          font-size: 15px;
          margin: 0 0 2px 0;
          font-weight: bold;
        }
        .header p {
          margin: 2px 0;
          font-size: 10px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 4mm 0;
        }
        .info-table {
          width: 100%;
          font-size: 10px;
          margin-bottom: 4mm;
        }
        .info-table td {
          padding: 1px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4mm;
        }
        .items-table th {
          border-bottom: 1px dashed #000;
          text-align: left;
          padding-bottom: 2px;
          font-weight: bold;
        }
        .items-table td {
          padding: 3px 0;
          vertical-align: top;
        }
        .qty { width: 10%; }
        .name { width: 45%; }
        .price { width: 22%; text-align: right; }
        .total { width: 23%; text-align: right; }
        
        .totals-table {
          width: 100%;
          margin-top: 2mm;
        }
        .totals-table td {
          padding: 2px 0;
        }
        .totals-table .val {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        
        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 6mm 0 4mm 0;
        }
        .qr-text {
          font-size: 8px;
          margin-top: 1mm;
          color: #333;
        }
        
        .footer {
          margin-top: 6mm;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="header text-center">
        <h1>D' YIYA SAMANÁ</h1>
        <p>Av. La Marina, Samaná, RD</p>
        <p>Tel: 809-538-2345</p>
        <p class="bold">RNC: 1-31-45678-9</p>
        <div class="divider"></div>
        <p class="bold" style="font-size: 12px; margin-top: 3px;">
          ${isFiscal ? "FACTURA DE CRÉDITO FISCAL" : "FACTURA DE CONSUMO"}
        </p>
        <p class="bold" style="font-size: 11px;">NCF: ${ncf}</p>
      </div>

      <table class="info-table">
        <tr>
          <td>Mesa: #${order.table_number || "—"}</td>
          <td class="text-right">Fecha: ${dateStr.split(",")[0]}</td>
        </tr>
        <tr>
          <td>Mesera: ${order.waitress_name || "Admin"}</td>
          <td class="text-right">Hora: ${dateStr.split(",")[1]?.trim() || ""}</td>
        </tr>
        ${
          order.rnc
            ? `<tr>
            <td colspan="2" class="bold">RNC Adquiriente: ${order.rnc}</td>
          </tr>`
            : ""
        }
      </table>

      <table class="items-table">
        <thead>
          <tr>
            <th colspan="2">Artículo</th>
            <th class="text-right">P.Unit</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="val">${formatRD(subtotal)}</td>
        </tr>
        <tr>
          <td>ITBIS (${itbisRate}%):</td>
          <td class="val">${formatRD(itbis)}</td>
        </tr>
        ${
          tip > 0
            ? `<tr>
            <td>Propina Legal (${propinaRate}%):</td>
            <td class="val">${formatRD(tip)}</td>
          </tr>`
            : ""
        }
        <tr class="bold" style="font-size: 13px;">
          <td>TOTAL RD$:</td>
          <td class="val" style="border-top: 1px solid #000; padding-top: 2px;">${formatRD(total)}</td>
        </tr>
        ${
          order.payment_method
            ? `
          <tr>
            <td>Método Pago:</td>
            <td class="val" style="text-transform: capitalize;">${order.payment_method === "card" ? "Tarjeta (CardNET)" : order.payment_method === "cash" ? "Efectivo" : order.payment_method === "mixed" ? "Pago Mixto" : "Transferencia"}</td>
          </tr>
        `
            : ""
        }
        ${
          order.amount_received
            ? `
          <tr>
            <td>Recibido:</td>
            <td class="val">${formatRD(parseFloat(order.amount_received.toString()))}</td>
          </tr>
          <tr>
            <td>Vuelto:</td>
            <td class="val">${formatRD(parseFloat((order.change || 0).toString()))}</td>
          </tr>
        `
            : ""
        }
      </table>

      ${qrImageHtml}

      <div class="divider"></div>

      <div class="footer text-center">
        <p class="bold">¡GRACIAS POR SU PREFERENCIA!</p>
        <p>D' Yiya Restaurante · Samaná</p>
        <p>DGII Ley 32-23 - Facturación Electrónica</p>
      </div>
    </body>
    </html>
  `;

  printHTML(html);
}

export function printCashClosing(caja: CashRegister) {
  const openDate = new Date(caja.opened_at).toLocaleString();
  const closeDate = caja.closed_at
    ? new Date(caja.closed_at).toLocaleString()
    : "En curso";
  const diff = (caja.actual_cash ?? 0) - (caja.expected_cash ?? 0);
  const isSquare = Math.abs(diff) < 0.01;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cierre Caja #${caja.id.slice(0,8)}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          width: 76mm;
          margin: 0 auto;
          padding: 4mm 2mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          background-color: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .header {
          margin-bottom: 5mm;
        }
        .header h1 {
          font-size: 14px;
          margin: 0 0 2px 0;
          font-weight: bold;
        }
        .header p {
          margin: 2px 0;
          font-size: 10px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 4mm 0;
        }
        .totals-table {
          width: 100%;
          margin-top: 2mm;
        }
        .totals-table td {
          padding: 3px 0;
        }
        .totals-table .val {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        .signature-section {
          margin-top: 12mm;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 45%;
          border-top: 1px solid #000;
          font-size: 9px;
          text-align: center;
          padding-top: 1mm;
        }
      </style>
    </head>
    <body>
      <div class="header text-center">
        <h1>D' YIYA SAMANÁ</h1>
        <p>ARQUEO DE CAJA DIARIO</p>
        <p>Reporte de Cierre de Turno</p>
        <div class="divider"></div>
      </div>

      <table style="width: 100%; font-size: 10px; margin-bottom: 4mm;">
        <tr>
          <td>Apertura:</td>
          <td class="text-right">${openDate}</td>
        </tr>
        <tr>
          <td>Cierre:</td>
          <td class="text-right">${closeDate}</td>
        </tr>
        <tr>
          <td>Abierto por:</td>
          <td class="text-right">${caja.opened_by_name || "Admin"}</td>
        </tr>
        <tr>
          <td>Cerrado por:</td>
          <td class="text-right">${caja.closed_by_name || "—"}</td>
        </tr>
        <tr>
          <td>Estado:</td>
          <td class="text-right bold" style="text-transform: uppercase;">${caja.status === "open" ? "Abierto" : "Cerrado"}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <table class="totals-table">
        <tr>
          <td>Fondo Inicial:</td>
          <td class="val">${formatRD(caja.initial_amount)}</td>
        </tr>
        ${
          caja.expected_cash
            ? `
          <tr>
            <td>Efectivo Esperado:</td>
            <td class="val">${formatRD(caja.expected_cash)}</td>
          </tr>
        `
            : ""
        }
        ${
          caja.actual_cash
            ? `
          <tr>
            <td>Efectivo Contado:</td>
            <td class="val">${formatRD(caja.actual_cash)}</td>
          </tr>
        `
            : ""
        }
        ${
          caja.status === "closed"
            ? `
          <tr style="font-size: 12px; border-top: 1px solid #000;">
            <td class="bold">Diferencia:</td>
            <td class="val" style="color: ${isSquare ? "#000" : diff < 0 ? "#F43F5E" : "#10B981"}">
              ${isSquare ? "CUADRADO" : `${diff > 0 ? "+" : ""}${formatRD(diff)}`}
            </td>
          </tr>
        `
            : ""
        }
      </table>

      ${
        caja.notes
          ? `
        <div style="margin-top: 4mm; font-size: 10px; border: 1px solid #000; padding: 2mm; border-radius: 4px;">
          <span class="bold">Observaciones:</span> ${caja.notes}
        </div>
      `
          : ""
      }

      <div class="signature-section">
        <div class="signature-box">Firma Cajera</div>
        <div class="signature-box">Firma Supervisor</div>
      </div>

      <div class="divider" style="margin-top: 8mm;"></div>
      <div class="text-center" style="font-size: 9px; color: #555;">
        <p>POS D' Yiya Samaná v1.0</p>
      </div>
    </body>
    </html>
  `;

  printHTML(html);
}
