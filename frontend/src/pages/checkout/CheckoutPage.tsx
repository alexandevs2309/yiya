import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ordersService } from "@/services/orders.service";
import { formatRD, calcITBIS, calcTotal, validateRncCedula } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings.store";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAudio } from "@/hooks/useAudio";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Wallet, Landmark, Banknote, Layers, ExternalLink, Loader2, AlertTriangle, Printer } from "lucide-react";
import type { Order } from "@/lib/types";
import { printReceipt } from "@/lib/printHelper";

const TIP_OPTIONS = [0, 10, 15, 18];
const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "CardNET", icon: Wallet },
  { value: "transfer", label: "Transfer", icon: Landmark },
  { value: "mixed", label: "Mixto", icon: Layers },
] as const;

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { play } = useAudio();
  const { addToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "mixed">("cash");
  const [tipPercent, setTipPercent] = useState(0);
  const [amountReceived, setAmountReceived] = useState("");
  const [rnc, setRnc] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  // Mixed Payment Sub-amounts
  const [mixedCash, setMixedCash] = useState("");
  const [mixedOther, setMixedOther] = useState("");

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  useEffect(() => {
    const handleEcfApproved = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.orderId === orderId) {
        setOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ecf_document: {
              id: prev.ecf_document?.id || "",
              order: prev.id,
              ecf_type: prev.ecf_document?.ecf_type || "02",
              rnc: prev.ecf_document?.rnc || "",
              status: detail.status,
              ecf_number: detail.ecfNumber,
              pdf_url: detail.pdfUrl,
              provisional_number: prev.ecf_document?.provisional_number || "",
              qr_code: "",
              whatsapp_sent: false,
              retries: 0,
              created_at: new Date().toISOString(),
            },
          };
        });
      }
    };

    window.addEventListener("ecf_approved", handleEcfApproved);
    return () => window.removeEventListener("ecf_approved", handleEcfApproved);
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const res = await ordersService.get(orderId!);
      setOrder(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "No se pudo recuperar la comanda.";
      addToast({
        title: "Error de carga",
        description: msg,
        variant: "error",
      });
      setTimeout(() => navigate("/tables"), 2000);
    }
  };

  // Reset fields when payment method changes
  useEffect(() => {
    if (method === "mixed" && order) {
      const sub = parseFloat(String(order.subtotal ?? order.items.reduce((s, i) => s + i.total_price, 0))) || 0;
      const itbisVal = calcITBIS(sub, useSettingsStore.getState().settings.itbisRate / 100);
      const tipVal = sub * (tipPercent / 100);
      const totalVal = calcTotal(sub, itbisVal, tipVal);
      const half = Math.round((totalVal / 2) * 100) / 100;
      setMixedCash(half.toString());
      setMixedOther((totalVal - half).toFixed(2));
    } else {
      setAmountReceived("");
    }
  }, [method, order, tipPercent]);

  if (!order) return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="text-sm text-text-tertiary">Cargando orden...</p>
    </div>
  );

  const subtotal = parseFloat(String(order.subtotal ?? order.items.reduce((s, i) => s + parseFloat(String(i.total_price)), 0))) || 0;
  const itbis = calcITBIS(subtotal, useSettingsStore.getState().settings.itbisRate / 100);
  const tip = subtotal * (tipPercent / 100);
  const total = calcTotal(subtotal, itbis, tip);

  const received = parseFloat(amountReceived) || 0;
  const mixedCashNum = parseFloat(mixedCash) || 0;
  const mixedOtherNum = parseFloat(mixedOther) || 0;

  // Change / Vuelto calculation
  const change =
    method === "mixed"
      ? (mixedCashNum + mixedOtherNum > total ? (mixedCashNum + mixedOtherNum) - total : 0)
      : (method === "cash" && received > total ? received - total : 0);

  // Validation
  const isValid =
    method === "mixed"
      ? (mixedCashNum + mixedOtherNum >= total && mixedCashNum >= 0 && mixedOtherNum >= 0)
      : (method !== "cash" || received >= total);

  const isRncValid = rnc === "" || validateRncCedula(rnc);

  // Auto-calculate remaining on input change
  const handleMixedCashChange = (val: string) => {
    setMixedCash(val);
    const cashVal = parseFloat(val);
    if (!isNaN(cashVal) && cashVal >= 0) {
      const diff = total - cashVal;
      setMixedOther(diff > 0 ? (Math.round(diff * 100) / 100).toString() : "0.00");
    }
  };

  const handleMixedOtherChange = (val: string) => {
    setMixedOther(val);
    const otherVal = parseFloat(val);
    if (!isNaN(otherVal) && otherVal >= 0) {
      const diff = total - otherVal;
      setMixedCash(diff > 0 ? (Math.round(diff * 100) / 100).toString() : "0.00");
    }
  };

  const handlePay = async () => {
    setLoading(true);
    const amountToSubmit =
      method === "cash"
        ? Math.round(received * 100) / 100
        : method === "mixed"
          ? Math.round((mixedCashNum + mixedOtherNum) * 100) / 100
          : undefined;

    try {
      const res = await ordersService.close(orderId!, {
        payment_method: method,
        subtotal: Math.round(subtotal * 100) / 100,
        itbis: Math.round(itbis * 100) / 100,
        total: Math.round(total * 100) / 100,
        tip: Math.round(tip * 100) / 100,
        amount_received: amountToSubmit,
        rnc,
        whatsapp,
      });
      const closedOrder = res.data;
      setOrder(closedOrder);
      setPaid(true);
      play("success");
      addToast({
        title: "Pago exitoso",
        description: `Mesa ${closedOrder.table_number} — Recibo #${closedOrder.receipt_number || "provisional"}`,
        variant: "success",
      });
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data
        ? Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
            .join(" | ")
        : "No se pudo procesar el pago";
      addToast({ title: "Error al cobrar", description: msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
          >
            <CheckCircle className="h-8 w-8 text-success" />
          </motion.div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Pago exitoso</h2>
          <p className="text-sm text-text-secondary mb-6">
            Mesa {order.table_number} · {formatRD(total)}
          </p>
          <div className="space-y-1.5 text-xs text-text-tertiary mb-6 border border-border/65 bg-bg-elevated/20 rounded-xl p-4 text-left">
            <div className="flex justify-between border-b border-border/40 pb-1.5 mb-1.5">
              <span>Recibo:</span>
              <span className="font-mono text-text-primary uppercase font-semibold">
                {order.receipt_number || "PROVISIONAL"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5 mb-1.5">
              <span>Método:</span>
              <span className="font-bold text-text-primary uppercase">
                {method === "cash" ? "Efectivo" : method === "card" ? "CardNET" : method === "transfer" ? "Transferencia" : "Pago Mixto"}
              </span>
            </div>
            {method === "mixed" && (
              <div className="space-y-0.5 border-b border-border/40 pb-1.5 mb-1.5">
                <div className="flex justify-between text-[11px]">
                  <span>Efectivo cobrado:</span>
                  <span className="font-mono text-text-primary">{formatRD(mixedCashNum)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Tarjeta/Transf cobrado:</span>
                  <span className="font-mono text-text-primary">{formatRD(mixedOtherNum)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{formatRD(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ITBIS 18%:</span>
              <span className="font-mono">{formatRD(itbis)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between">
                <span>Propina ({tipPercent}%):</span>
                <span className="font-mono">{formatRD(tip)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-text-primary pt-1.5 border-t border-border/40 mt-1.5">
              <span>Total pagado:</span>
              <span className="font-mono">{formatRD(total)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between text-xs font-bold text-success pt-1">
                <span>Vuelto:</span>
                <span className="font-mono">{formatRD(change)}</span>
              </div>
            )}
          </div>

          {/* Facturación Electrónica (DGII Ley 32-23) */}
          <div className="mt-4 mb-6 text-xs border border-border/65 bg-bg-elevated/20 rounded-xl p-4 text-left">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              Comprobante Electrónico (e-CF)
            </p>
            
            {!isOnline || order.id.startsWith("offline_") ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Pendiente (Modo Offline)</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-normal">
                  La factura fiscal e-CF oficial se emitirá y enviará por WhatsApp automáticamente cuando el sistema recupere conexión a internet.
                </p>
              </div>
            ) : !order.ecf_document || order.ecf_document.status === "pending" ? (
              <div className="rounded-lg border border-border bg-bg-elevated/40 p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-text-primary">FIRMANDO COMPROBANTE...</span>
                  <p className="text-[10px] text-text-tertiary leading-normal">
                    Validando firma XML ante la DGII en tiempo real.
                  </p>
                </div>
                <Loader2 className="h-4 w-4 text-sky-400 animate-spin" />
              </div>
            ) : order.ecf_document.status === "approved" ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <span className="font-bold text-emerald-400 block mb-1">Autorizado por la DGII ✅</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-text-tertiary">e-NCF:</span>
                    <span className="font-mono text-xs font-bold text-text-primary tracking-wider select-all uppercase">
                      {order.ecf_document.ecf_number}
                    </span>
                  </div>
                </div>
                {order.ecf_document.pdf_url && (
                  <a
                    href={order.ecf_document.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Descargar Factura Fiscal (PDF)
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <span className="font-semibold text-red-400 block mb-1">Error de Emisión Fiscal ⚠️</span>
                <p className="text-[10px] text-text-secondary leading-normal">
                  Fallo en la comunicación con la DGII. El sistema reintentará la emisión de forma automática en segundo plano.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => printReceipt(order)}
              className="flex-1 h-12 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </button>
            <Button className="flex-1 h-12 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white" onClick={() => navigate("/tables")}>
              Volver a mesas
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/tables")}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-secondary text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-text-primary">Cobrar · Mesa {order.table_number}</h1>
          <p className="text-[11px] text-text-tertiary">#{order.id_short}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin sm:flex-row">
        {/* Order Items List */}
        <div className="flex-1 space-y-2">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Productos</p>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{item.quantity}x {item.name}</p>
                {item.modifiers?.length > 0 && (
                  <p className="text-[11px] text-text-tertiary">{item.modifiers.join(" · ")}</p>
                )}
              </div>
              <span className="text-sm font-bold text-text-primary tabular-nums">{formatRD(item.total_price)}</span>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="w-full sm:w-72 space-y-4">
          {/* TOTAL */}
          <div className="text-center py-2 bg-bg-elevated/25 border border-border/50 rounded-2xl">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Total</p>
            <p className="text-4xl font-extrabold text-text-primary tabular-nums leading-none">
              {formatRD(total)}
            </p>
          </div>

          {/* Payment Methods */}
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Método de pago</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    disabled={!isOnline && m.value !== "cash"}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-[10px] font-bold uppercase transition-all ${
                      method === m.value
                        ? "bg-accent text-white"
                        : "border border-border bg-bg-elevated text-text-secondary hover:bg-bg-active"
                    } disabled:opacity-30`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Propina */}
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Propina legal (10% sugerido)</p>
            <div className="flex gap-1.5">
              {TIP_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTipPercent(pct)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                    tipPercent === pct ? "bg-accent text-white" : "border border-border bg-bg-elevated text-text-secondary hover:bg-bg-active"
                  }`}
                >
                  {pct === 0 ? "Sin" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Recibí (Solo Efectivo) */}
          {method === "cash" && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Recibí</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium">RD$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-bg-elevated pl-11 pr-3.5 text-lg font-bold tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              </div>
              {change > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-success/10 px-3.5 py-2.5">
                  <span className="text-xs font-bold text-success uppercase tracking-wider">Vuelto</span>
                  <span className="text-lg font-extrabold text-success tabular-nums">{formatRD(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Pago Mixto Inputs */}
          {method === "mixed" && (
            <div className="space-y-3 p-3 bg-bg-elevated/20 border border-border rounded-xl">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Monto en Efectivo
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">RD$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={mixedCash}
                    onChange={(e) => handleMixedCashChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-bg-base pl-9 pr-3 text-sm font-bold tabular-nums text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Monto en Tarjeta / Transferencia
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">RD$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={mixedOther}
                    onChange={(e) => handleMixedOtherChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-bg-base pl-9 pr-3 text-sm font-bold tabular-nums text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Validation helper text */}
              {!isValid && (
                <p className="text-[10px] text-warning font-semibold leading-normal">
                  La suma de ambos pagos debe ser al menos {formatRD(total)}
                </p>
              )}

              {change > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 border border-success/20">
                  <span className="text-[10px] font-bold text-success uppercase tracking-wider">Vuelto</span>
                  <span className="text-base font-extrabold text-success tabular-nums">{formatRD(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* RNC + WhatsApp */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">RNC (opcional)</p>
              <input
                placeholder="000000000"
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                maxLength={9}
                className={`h-10 w-full rounded-lg border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                  rnc && !isRncValid ? "border-danger" : "border-border"
                }`}
              />
              {rnc && !isRncValid && (
                <p className="mt-0.5 text-[10px] text-danger">RNC debe tener 9 dígitos</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">WhatsApp (opcional)</p>
              <input
                placeholder="8090000000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Desglose de impuestos */}
          <div className="text-[11px] text-text-tertiary space-y-0.5 pt-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRD(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ITBIS 18%</span>
              <span className="tabular-nums">{formatRD(itbis)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between">
                <span>Propina</span>
                <span className="tabular-nums">{formatRD(tip)}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex gap-2">
            <button
              onClick={() => printReceipt(order)}
              className="flex-1 h-14 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Pre-cuenta
            </button>
            <Button
              onClick={handlePay}
              disabled={loading || !isValid || !isRncValid}
              className="flex-[2] h-14 text-base font-bold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-button"
            >
              {loading ? "Procesando..." : `Cobrar ${formatRD(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
