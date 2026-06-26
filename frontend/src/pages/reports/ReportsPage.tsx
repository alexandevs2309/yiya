import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  FileCheck,
  Building,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatRD } from "@/lib/utils";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ecfService } from "@/services/ecf.service";
import { purchasesService } from "@/services/purchases.service";
import { db } from "@/services/db";
import type { ECFDocument, Purchase, ECFStatus } from "@/lib/types";



interface NcfSummary {
  type: string;
  code: string;
  count: number;
  subtotal: number;
  itbis: number;
  total: number;
}

interface HistoricalReport {
  id: string;
  filename: string;
  type: "606" | "607";
  period: string;
  generatedAt: string;
  recordsCount: number;
  status: "valid" | "warning";
}

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

export default function ReportsPage() {
  const { addToast } = useToast();
  const isOnline = useNetworkStatus();
  
  // Selection states
  const [selectedMonth, setSelectedMonth] = useState<string>("06"); // Junio
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [loading, setLoading] = useState(false);
  const [realSales, setRealSales] = useState<ECFDocument[]>([]);
  const [realPurchases, setRealPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    loadRealData();
  }, [selectedMonth, selectedYear, isOnline]);

  const loadRealData = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const [salesRes, purchasesRes] = await Promise.all([
          ecfService.list({ year: selectedYear, month: selectedMonth, page_size: 1000 }),
          purchasesService.list({ year: selectedYear, month: selectedMonth, page_size: 1000 }),
        ]);
        const salesData = salesRes.data.results || salesRes.data;
        const purchasesData = purchasesRes.data.results || purchasesRes.data;
        setRealSales(salesData);
        setRealPurchases(purchasesData);
      } else {
        const allOrders = await db.getOrders();
        const periodOrders = allOrders.filter((order) => {
          if (order.status !== "paid" || !order.created_at) return false;
          const date = new Date(order.created_at);
          const orderYear = date.getFullYear().toString();
          const orderMonth = (date.getMonth() + 1).toString().padStart(2, "0");
          return orderYear === selectedYear && orderMonth === selectedMonth;
        });

        const localECFs: ECFDocument[] = periodOrders.map((order) => {
          const isFiscal = !!order.rnc;
          return {
            id: order.id,
            order: order.id,
            ecf_type: isFiscal ? "01" : "02",
            rnc: order.rnc || "",
            ecf_number: isFiscal ? `E31${selectedMonth}${order.id_short || ""}`.substring(0, 19) : `E32${selectedMonth}${order.id_short || ""}`.substring(0, 19),
            status: "approved" as ECFStatus,
            provisional_number: order.receipt_number || "",
            pdf_url: "",
            qr_code: "",
            whatsapp_sent: false,
            retries: 0,
            created_at: order.created_at,
            order_total: order.total || 0,
            order_subtotal: order.subtotal || 0,
            order_itbis: order.itbis || 0,
            order_tip: order.tip || 0,
            order_payment_method: order.payment_method || "cash",
            order_amount_received: order.amount_received || 0,
          };
        });
        setRealSales(localECFs);
        setRealPurchases([]);
      }
    } catch (error) {
      console.error("Error loading reports data:", error);
      addToast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los registros del período seleccionado.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };


  // Mocked historical reports
  const [history, setHistory] = useState<HistoricalReport[]>([
    {
      id: "h1",
      filename: "DGII_607_202605_VENTAS.csv",
      type: "607",
      period: "Mayo 2026",
      generatedAt: "2026-06-01T10:12:00Z",
      recordsCount: 148,
      status: "valid",
    },
    {
      id: "h2",
      filename: "DGII_606_202605_COMPRAS.csv",
      type: "606",
      period: "Mayo 2026",
      generatedAt: "2026-06-01T10:14:00Z",
      recordsCount: 32,
      status: "valid",
    },
    {
      id: "h3",
      filename: "DGII_607_202604_VENTAS.csv",
      type: "607",
      period: "Abril 2026",
      generatedAt: "2026-05-02T09:30:00Z",
      recordsCount: 125,
      status: "valid",
    },
    {
      id: "h4",
      filename: "DGII_606_202604_COMPRAS.csv",
      type: "606",
      period: "Abril 2026",
      generatedAt: "2026-05-02T09:35:00Z",
      recordsCount: 28,
      status: "warning", // Advertencia por algún RNC incompleto
    },
  ]);

  // Months labels in Spanish
  const months = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const years = ["2026", "2025"];

  // Period label helper
  const currentPeriodLabel = useMemo(() => {
    const m = months.find((mo) => mo.value === selectedMonth);
    return `${m?.label} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Period key (e.g. 202606)
  const currentPeriodKey = useMemo(() => {
    return `${selectedYear}${selectedMonth}`;
  }, [selectedMonth, selectedYear]);

  // Calculate stats based on actual sales and purchases records
  const stats = useMemo(() => {
    const salesCount = realSales.length;
    let salesSubtotal = 0;
    let salesItbis = 0;
    let salesPropina = 0;
    let salesTotal = 0;

    realSales.forEach((sale) => {
      salesSubtotal += parseFloat(String(sale.order_subtotal || 0));
      salesItbis += parseFloat(String(sale.order_itbis || 0));
      salesPropina += parseFloat(String(sale.order_tip || 0));
      salesTotal += parseFloat(String(sale.order_total || 0));
    });

    const purchasesCount = realPurchases.length;
    let purchasesTotal = 0;
    let purchasesItbis = 0;

    realPurchases.forEach((purchase) => {
      purchasesTotal += parseFloat(String(purchase.total || 0));
      purchasesItbis += parseFloat(String(purchase.itbis || 0));
    });

    return {
      salesCount,
      salesSubtotal,
      salesItbis,
      salesPropina,
      salesTotal,
      purchasesCount,
      purchasesTotal,
      purchasesItbis,
    };
  }, [realSales, realPurchases]);

  // NCF Summaries breakdown from actual sales records
  const ncfSummaries = useMemo<NcfSummary[]>(() => {
    const b01Sales = realSales.filter((s) => s.ecf_type === "01");
    let subB01 = 0;
    let itbisB01 = 0;
    b01Sales.forEach((s) => {
      subB01 += parseFloat(String(s.order_subtotal || 0));
      itbisB01 += parseFloat(String(s.order_itbis || 0));
    });

    const b02Sales = realSales.filter((s) => s.ecf_type === "02");
    let subB02 = 0;
    let itbisB02 = 0;
    b02Sales.forEach((s) => {
      subB02 += parseFloat(String(s.order_subtotal || 0));
      itbisB02 += parseFloat(String(s.order_itbis || 0));
    });

    const otherSales = realSales.filter((s) => s.ecf_type !== "01" && s.ecf_type !== "02");
    let subOther = 0;
    let itbisOther = 0;
    otherSales.forEach((s) => {
      subOther += parseFloat(String(s.order_subtotal || 0));
      itbisOther += parseFloat(String(s.order_itbis || 0));
    });

    return [
      {
        type: "Crédito Fiscal",
        code: "E31",
        count: b01Sales.length,
        subtotal: subB01,
        itbis: itbisB01,
        total: subB01 + itbisB01,
      },
      {
        type: "Consumidor Final",
        code: "E32",
        count: b02Sales.length,
        subtotal: subB02,
        itbis: itbisB02,
        total: subB02 + itbisB02,
      },
      {
        type: "Otros Comprobantes",
        code: "Otros",
        count: otherSales.length,
        subtotal: subOther,
        itbis: itbisOther,
        total: subOther + itbisOther,
      },
    ];
  }, [realSales]);


  // Export 607 CSV
  const handleExport607 = () => {
    if (realSales.length === 0) {
      addToast({
        title: "No hay registros",
        description: "No se encontraron ventas registradas en el período seleccionado.",
        variant: "error",
      });
      return;
    }

    addToast({
      title: "Generando Reporte 607",
      description: `Procesando ${realSales.length} ventas de ${currentPeriodLabel}...`,
    });

    setTimeout(() => {
      const headers = [
        "RNC o Cedula",
        "Tipo Identificacion",
        "NCF",
        "NCF Modificado",
        "Tipo de Ingreso",
        "Fecha Comprobante",
        "Fecha Retencion",
        "Monto Facturado",
        "ITBIS Facturado",
        "ITBIS Retenido",
        "ITBIS Percibido",
        "Retencion ISR",
        "Monto Propina Legal",
        "Efectivo",
        "Tarjeta Credito Debito",
        "Transferencia",
      ];

      const rows: string[][] = [];

      realSales.forEach((sale) => {
        const rawRnc = sale.rnc || "";
        let idType = "3"; // Sin identificación / Consumidor Final
        if (rawRnc.length === 9) {
          idType = "1"; // RNC
        } else if (rawRnc.length === 11) {
          idType = "2"; // Cédula
        }

        const dateObj = new Date(sale.created_at);
        const formattedDate = isNaN(dateObj.getTime())
          ? ""
          : dateObj.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD format

        const subtotal = parseFloat(String(sale.order_subtotal || 0));
        const itbis = parseFloat(String(sale.order_itbis || 0));
        const tip = parseFloat(String(sale.order_tip || 0));
        const total = parseFloat(String(sale.order_total || 0));
        const method = sale.order_payment_method || "cash";

        let cashVal = 0;
        let cardVal = 0;
        let transferVal = 0;

        if (method === "cash") {
          cashVal = total;
        } else if (method === "card") {
          cardVal = total;
        } else if (method === "transfer") {
          transferVal = total;
        } else if (method === "mixed") {
          cashVal = parseFloat(String(sale.order_amount_received || 0));
          cardVal = Math.max(0, total - cashVal);
        }

        rows.push([
          rawRnc,
          idType,
          sale.ecf_number || sale.provisional_number,
          "",
          "01", // Tipo de Ingreso (01 = Ingresos por Operaciones)
          formattedDate,
          "",
          subtotal.toFixed(2),
          itbis.toFixed(2),
          "0.00",
          "0.00",
          "0.00",
          tip.toFixed(2),
          cashVal.toFixed(2),
          cardVal.toFixed(2),
          transferVal.toFixed(2),
        ]);
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `DGII_607_${currentPeriodKey}_VENTAS.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const newReport: HistoricalReport = {
        id: Date.now().toString(),
        filename,
        type: "607",
        period: currentPeriodLabel,
        generatedAt: new Date().toISOString(),
        recordsCount: rows.length,
        status: "valid",
      };
      setHistory(prev => [newReport, ...prev]);

      addToast({
        title: "Reporte 607 Descargado",
        description: `Se han exportado ${rows.length} registros reales para la DGII.`,
      });
    }, 1000);
  };

  // Export 606 CSV
  const handleExport606 = () => {
    if (realPurchases.length === 0) {
      addToast({
        title: "No hay registros",
        description: "No se encontraron compras registradas en el período seleccionado.",
        variant: "error",
      });
      return;
    }

    addToast({
      title: "Generando Reporte 606",
      description: `Procesando ${realPurchases.length} compras de ${currentPeriodLabel}...`,
    });

    setTimeout(() => {
      const headers = [
        "RNC o Cedula Proveedor",
        "Tipo Identificacion",
        "Tipo de Bienes y Servicios",
        "NCF",
        "NCF Modificado",
        "Fecha Comprobante",
        "Fecha Pago",
        "Monto Facturado Servicios",
        "Monto Facturado Bienes",
        "Total Monto Facturado",
        "ITBIS Facturado",
        "ITBIS Retenido",
        "ITBIS por Adelantar",
        "Forma de Pago",
      ];

      const rows: string[][] = [];

      realPurchases.forEach((purchase) => {
        const rawRnc = purchase.supplier_rnc || "";
        let idType = "3";
        if (rawRnc.length === 9) {
          idType = "1";
        } else if (rawRnc.length === 11) {
          idType = "2";
        }

        const dateStr = purchase.date ? purchase.date.replace(/-/g, "") : "";

        const subtotal = parseFloat(String(purchase.subtotal || 0));
        const itbis = parseFloat(String(purchase.itbis || 0));

        let bienServicioType = "02"; // Gastos de Compras y Suministros
        const nameLower = purchase.supplier_name.toLowerCase();
        if (nameLower.includes("gas") || nameLower.includes("combustible") || nameLower.includes("bahia")) {
          bienServicioType = "03"; // Gastos de Viaje y Combustibles
        } else if (nameLower.includes("electricidad") || nameLower.includes("luz") || nameLower.includes("internet") || nameLower.includes("caribe")) {
          bienServicioType = "04"; // Gastos de Servicios
        } else if (nameLower.includes("papeleria") || nameLower.includes("oficina")) {
          bienServicioType = "05"; // Gastos de Oficina
        }

        const isServicio = bienServicioType === "04";
        const montoServicios = isServicio ? subtotal : 0;
        const montoBienes = !isServicio ? subtotal : 0;

        rows.push([
          rawRnc,
          idType,
          bienServicioType,
          purchase.ncf,
          "",
          dateStr,
          dateStr,
          montoServicios.toFixed(2),
          montoBienes.toFixed(2),
          subtotal.toFixed(2),
          itbis.toFixed(2),
          "0.00",
          itbis.toFixed(2),
          "04", // Forma de Pago (04 = Transferencia / Depósito / Tarjeta)
        ]);
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `DGII_606_${currentPeriodKey}_COMPRAS.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const newReport: HistoricalReport = {
        id: Date.now().toString(),
        filename,
        type: "606",
        period: currentPeriodLabel,
        generatedAt: new Date().toISOString(),
        recordsCount: rows.length,
        status: "valid",
      };
      setHistory(prev => [newReport, ...prev]);

      addToast({
        title: "Reporte 606 Descargado",
        description: `Se han exportado ${rows.length} compras reales para la DGII.`,
      });
    }, 1000);
  };


  const handleDownloadAgain = (filename: string) => {
    addToast({
      title: "Descarga Iniciada",
      description: `Descargando de nuevo el archivo ${filename}`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border bg-bg-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
            Reportes Fiscales (DGII)
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Generación y exportación oficial de formatos 606 (Gastos) y 607 (Ventas) según la ley de facturación electrónica.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex gap-2 bg-bg-base p-1.5 rounded-xl border border-border">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent pl-3 pr-8 py-1.5 text-sm font-semibold focus:outline-none text-text-primary appearance-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value} className="bg-bg-surface text-text-primary">
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          </div>
          <div className="border-l border-border h-5 my-auto" />
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent pl-3 pr-8 py-1.5 text-sm font-semibold focus:outline-none text-text-primary appearance-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-bg-surface text-text-primary">
                  {y}
                </option>
              ))}
            </select>
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="p-6 space-y-6 flex-1">
        {/* KPI Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card">
            <span className="text-xs text-text-secondary font-medium block">Ventas Reportadas ({selectedMonth}/{selectedYear})</span>
            <span className="text-2xl font-bold text-text-primary block mt-2">{formatRD(stats.salesTotal)}</span>
            <div className="flex items-center gap-1 mt-2 text-[11px] text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{stats.salesCount} comprobantes emitidos</span>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card">
            <span className="text-xs text-text-secondary font-medium block">ITBIS Ventas (18%)</span>
            <span className="text-2xl font-bold text-text-primary block mt-2">{formatRD(stats.salesItbis)}</span>
            <span className="text-[11px] text-text-tertiary mt-2 block">
              Subtotal: {formatRD(stats.salesSubtotal)}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card">
            <span className="text-xs text-text-secondary font-medium block">Total Gastos (606)</span>
            <span className="text-2xl font-bold text-text-primary block mt-2">{formatRD(stats.purchasesTotal)}</span>
            <span className="text-[11px] text-emerald-400 mt-2 block font-medium">
              ITBIS Deducible: {formatRD(stats.purchasesItbis)}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card">
            <span className="text-xs text-text-secondary font-medium block">Balance ITBIS Estimado</span>
            <span className="text-2xl font-bold text-indigo-400 block mt-2">
              {formatRD(Math.max(0, stats.salesItbis - stats.purchasesItbis))}
            </span>
            <span className="text-[11px] text-text-tertiary mt-2 block">
              Diferencia a pagar a DGII
            </span>
          </div>
        </div>

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 607 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={fastTransition}
            className="p-6 rounded-2xl bg-bg-surface border border-border flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-sky-500/50"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Formato 607 — Ventas</h3>
                  <span className="text-xs text-text-tertiary">Envío mensual de comprobantes emitidos</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Genera el archivo detallado con todas las ventas facturadas del mes, incluyendo facturas con crédito fiscal (B01), de consumo (B02) y de regímenes especiales (B14), junto al desglose de propinas legales y montos de ITBIS cobrados.
              </p>
            </div>
            <button
              onClick={handleExport607}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-button text-sm"
            >
              <Download className="h-4 w-4" />
              Exportar Formato 607 ({currentPeriodLabel})
            </button>
          </motion.div>

          {/* Card 606 */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={fastTransition}
            className="p-6 rounded-2xl bg-bg-surface border border-border flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-emerald-500/50"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Formato 606 — Compras</h3>
                  <span className="text-xs text-text-tertiary">Envío mensual de costos y gastos</span>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Genera el reporte de compras de insumos, pescados, mariscos, servicios de energía, mantenimiento y otros gastos operativos del restaurante. Habilita la deducción del ITBIS adelantado en compras fiscales aprobadas.
              </p>
            </div>
            <button
              onClick={handleExport606}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-button text-sm"
            >
              <Download className="h-4 w-4" />
              Exportar Formato 606 ({currentPeriodLabel})
            </button>
          </motion.div>
        </div>

        {/* NCF Breakdown & Historical List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NCF Breakdown */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-bg-surface border border-border shadow-card flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-indigo-400" />
                Distribución de NCFs ({selectedMonth}/{selectedYear})
              </h4>
              <div className="space-y-4">
                {ncfSummaries.map((ncf) => (
                  <div key={ncf.code} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        {ncf.code} - {ncf.type}
                      </span>
                      <span className="text-xs bg-bg-elevated px-2 py-0.5 rounded-lg text-text-secondary font-mono">
                        {ncf.count} u.
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Subtotal: {formatRD(ncf.subtotal)}</span>
                      <span>ITBIS: {formatRD(ncf.itbis)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-3 bg-bg-base/50 rounded-xl border border-border flex items-start gap-2 text-xs text-text-secondary leading-normal">
              <Info className="h-4 w-4 text-text-tertiary flex-shrink-0 mt-0.5" />
              <p>
                Los comprobantes se emiten de forma provisional offline y se validan automáticamente con el BaaS de e-CF (Alanube) al detectar red.
              </p>
            </div>
          </div>

          {/* Download History */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-bg-surface border border-border shadow-card flex flex-col">
            <h4 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Histórico de Descargas y Validaciones
            </h4>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-text-tertiary font-semibold">
                    <th className="pb-3 pl-2">Archivo</th>
                    <th className="pb-3">Periodo</th>
                    <th className="pb-3 text-center">Registros</th>
                    <th className="pb-3">Estado DGII</th>
                    <th className="pb-3 text-right pr-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-bg-elevated/20 group transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-xs text-text-primary max-w-[200px] truncate" title={h.filename}>
                        {h.filename}
                      </td>
                      <td className="py-3.5 text-text-secondary text-xs">{h.period}</td>
                      <td className="py-3.5 text-center font-semibold font-mono text-xs text-text-primary">
                        {h.recordsCount}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            h.status === "valid"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              h.status === "valid" ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          {h.status === "valid" ? "Sin Errores" : "Advertencia"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => handleDownloadAgain(h.filename)}
                          className="p-1 px-2 text-xs rounded bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary flex items-center gap-1.5 ml-auto transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Bajar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
