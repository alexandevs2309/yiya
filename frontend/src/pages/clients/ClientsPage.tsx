import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  Phone,
  FileText,
  Mail,
  Trash2,
  X,
  Users,
  CheckCircle,
  Building2,
  Plus,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { clientsService } from "@/services/clients.service";

interface Client {
  id: string;
  name: string;
  rnc: string;
  phone: string;
  email: string;
  notes?: string;
  visit_count: number;
  last_visit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

export default function ClientsPage() {
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "rnc" | "whatsapp">("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [rnc, setRnc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load clients from API on mount
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const res = await clientsService.list();
        const data = res.data;
        // Handle both paginated (DRF default) and non-paginated responses
        if (data && Array.isArray(data.results)) {
          setClients(data.results);
        } else if (Array.isArray(data)) {
          setClients(data);
        } else {
          setClients([]);
        }
      } catch (err: any) {
        addToast({
          title: "Error al cargar clientes",
          description:
            err?.response?.data?.detail || "No se pudieron cargar los clientes del servidor.",
          variant: "error",
        });
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Filter Type
      if (filterType === "rnc") {
        // En RD, RNC fiscal tiene 9 dígitos (o con guiones) y Cédula tiene 11.
        // Asumimos que los de tipo corporativo o RNC específicos
        const cleanRnc = c.rnc.replace(/[^0-9]/g, "");
        if (cleanRnc.length !== 9) return false;
      }
      if (filterType === "whatsapp") {
        if (!c.phone || c.phone.replace(/[^0-9]/g, "").length < 10) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        const matchesRnc = c.rnc.replace(/[^0-9a-zA-Z]/g, "").includes(q.replace(/[^0-9a-zA-Z]/g, ""));
        const matchesEmail = c.email.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesRnc || matchesEmail;
      }

      return true;
    });
  }, [clients, searchQuery, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const total = clients.length;
    const whatsappActive = clients.filter((c) => c.phone.replace(/[^0-9]/g, "").length >= 10).length;
    const rncFiscal = clients.filter((c) => c.rnc.replace(/[^0-9]/g, "").length === 9).length;
    return { total, whatsappActive, rncFiscal };
  }, [clients]);

  // Handle Register Client
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio.";
    }

    const cleanRnc = rnc.replace(/[^0-9]/g, "");
    if (cleanRnc && cleanRnc.length !== 9 && cleanRnc.length !== 11) {
      newErrors.rnc = "El RNC debe tener 9 dígitos y la Cédula 11.";
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone && cleanPhone.length < 10) {
      newErrors.phone = "El teléfono/WhatsApp debe tener al menos 10 dígitos.";
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "El correo electrónico no es válido.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({
        title: "Error de Validación",
        description: "Por favor corrige los campos indicados.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await clientsService.create({
        name: name.trim(),
        rnc: rnc.trim(),
        phone: cleanPhone,
        email: email.trim(),
        notes: notes.trim(),
      });
      setClients([res.data, ...clients]);
      setIsModalOpen(false);

      // Reset Form
      setName("");
      setRnc("");
      setPhone("");
      setEmail("");
      setNotes("");
      setErrors({});

      addToast({
        title: "Cliente Registrado",
        description: `Se ha registrado a ${res.data.name} con éxito.`,
      });
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        // Show first field error from API if available
        const firstKey = Object.keys(detail).find((k) => Array.isArray(detail[k]));
        addToast({
          title: "Error al registrar",
          description: firstKey ? detail[firstKey][0] : "Ocurrió un error al guardar el cliente.",
          variant: "error",
        });
      } else {
        addToast({
          title: "Error al registrar",
          description: "No se pudo conectar con el servidor.",
          variant: "error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string, clientName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a "${clientName}"?`)) {
      try {
        await clientsService.delete(id);
        setClients(clients.filter((c) => c.id !== id));
        addToast({
          title: "Cliente Eliminado",
          description: `Se ha eliminado a ${clientName} del directorio.`,
        });
      } catch (err: any) {
        addToast({
          title: "Error al eliminar",
          description:
            err?.response?.data?.detail || "No se pudo eliminar el cliente. Intenta de nuevo.",
          variant: "error",
        });
      }
    }
  };

  // Helper to format Dominican Phone Numbers (e.g. 809-538-2345)
  const formatPhone = (phoneStr: string) => {
    const clean = phoneStr.replace(/[^0-9]/g, "");
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return phoneStr;
  };

  // Helper to get color initials
  const getInitialsBg = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "from-sky-500 to-indigo-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-pink-500",
      "from-amber-500 to-orange-500",
      "from-violet-500 to-purple-500",
    ];
    return colors[hash % colors.length];
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to format last visit date
  const formatLastVisit = (lastVisit: string | null) => {
    if (!lastVisit) return null;
    try {
      return new Date(lastVisit).toLocaleDateString("es-DO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary overflow-y-auto">
      {/* Top Banner / Hero */}
      <div className="p-6 border-b border-border bg-bg-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-500" />
            Directorio de Clientes
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gestiona los perfiles de facturación fiscal (RNC) y contactos de envío por WhatsApp (DGII Ley 32-23).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white font-medium rounded-xl shadow-button text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Cliente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-bg-surface border border-border flex items-center justify-between shadow-card"
        >
          <div>
            <span className="text-sm text-text-secondary font-medium">Total Clientes</span>
            <h3 className="text-3xl font-bold text-text-primary mt-1">{stats.total}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Users className="h-6 w-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-bg-surface border border-border flex items-center justify-between shadow-card"
        >
          <div>
            <span className="text-sm text-text-secondary font-medium">WhatsApp Habilitado</span>
            <h3 className="text-3xl font-bold text-emerald-500 mt-1">{stats.whatsappActive}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <MessageSquare className="h-6 w-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-bg-surface border border-border flex items-center justify-between shadow-card"
        >
          <div>
            <span className="text-sm text-text-secondary font-medium">RNC Fiscales (B01)</span>
            <h3 className="text-3xl font-bold text-indigo-400 mt-1">{stats.rncFiscal}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 pb-6">
        <div className="flex flex-col md:flex-row gap-4 bg-bg-surface p-4 rounded-2xl border border-border shadow-card">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nombre, RNC, cédula o WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-bg-base border border-border rounded-xl focus:border-sky-500 focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "rnc", "whatsapp"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                  filterType === t
                    ? "bg-bg-elevated border-sky-500 text-sky-400"
                    : "bg-bg-base border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "all" ? "Todos" : t === "rnc" ? "RNC Fiscal" : "WhatsApp"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid / Table */}
      <div className="flex-1 px-6 pb-8">
        {isLoading ? (
          /* Skeleton Loading Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-full bg-bg-elevated" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-elevated rounded w-3/4" />
                    <div className="h-3 bg-bg-elevated rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2.5 my-4 border-t border-border/50 pt-4">
                  <div className="h-3 bg-bg-elevated rounded w-full" />
                  <div className="h-3 bg-bg-elevated rounded w-2/3" />
                  <div className="h-3 bg-bg-elevated rounded w-3/4" />
                  <div className="h-3 bg-bg-elevated rounded w-1/2" />
                </div>
                <div className="mt-3 p-3 bg-bg-base/70 rounded-xl border border-border/50">
                  <div className="h-3 bg-bg-elevated rounded w-full" />
                </div>
                <div className="flex justify-between items-center mt-6 pt-3 border-t border-border/40">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 bg-bg-elevated rounded-full" />
                    <div className="h-5 w-20 bg-bg-elevated rounded-full" />
                  </div>
                  <div className="h-7 w-7 bg-bg-elevated rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl bg-bg-surface/50">
            <Users className="h-12 w-12 text-text-tertiary mb-3 animate-pulse" />
            <p className="text-text-primary font-medium">No se encontraron clientes</p>
            <p className="text-xs text-text-secondary mt-1">Prueba refinando la búsqueda o registra uno nuevo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredClients.map((client) => {
                const cleanRnc = client.rnc.replace(/[^0-9]/g, "");
                const isFiscal = cleanRnc.length === 9;
                return (
                  <motion.div
                    key={client.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={fastTransition}
                    className="p-5 rounded-2xl bg-bg-surface border border-border hover:border-border-strong transition-all flex flex-col justify-between shadow-card relative overflow-hidden group"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-11 w-11 rounded-full bg-gradient-to-tr ${getInitialsBg(client.name)} flex items-center justify-center text-white font-bold text-sm shadow-inner`}>
                          {getInitials(client.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-text-primary truncate text-base leading-snug group-hover:text-sky-400 transition-colors">
                            {client.name}
                          </h4>
                          <span className="text-[11px] text-text-tertiary block mt-0.5">
                            Registrado: {new Date(client.created_at).toLocaleDateString("es-DO")}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2.5 text-sm my-4 border-t border-border/50 pt-4">
                        <div className="flex items-center gap-2.5 text-text-secondary">
                          <FileText className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                          <span className="font-mono text-xs truncate">
                            {client.rnc ? (
                              <>
                                <span className="text-text-tertiary mr-1">{isFiscal ? "RNC:" : "Cédula:"}</span>
                                {client.rnc}
                              </>
                            ) : (
                              <span className="text-text-tertiary italic">Sin identificación fiscal</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-text-secondary">
                          <Phone className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs truncate">
                            {client.phone ? formatPhone(client.phone) : <span className="text-text-tertiary italic">Sin teléfono</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-text-secondary">
                          <Mail className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs truncate">
                            {client.email || <span className="text-text-tertiary italic">Sin correo electrónico</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-text-secondary">
                          <Activity className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs">
                            {client.visit_count} visita{client.visit_count !== 1 ? "s" : ""}
                            {formatLastVisit(client.last_visit) && (
                              <> · Última: {formatLastVisit(client.last_visit)}</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Notes block if any */}
                      {client.notes && (
                        <div className="mt-3 p-3 bg-bg-base/70 rounded-xl border border-border/50">
                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 italic">
                            "{client.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom badging and actions */}
                    <div className="flex justify-between items-center mt-6 pt-3 border-t border-border/40">
                      <div className="flex gap-1.5 flex-wrap">
                        {isFiscal && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold tracking-wider uppercase">
                            Fiscal B01
                          </span>
                        )}
                        {client.phone && client.phone.replace(/[^0-9]/g, "").length >= 10 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase flex items-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5" />
                            WhatsApp
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Eliminar Cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal - Registrar Cliente */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={fastTransition}
              className="w-full max-w-lg bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-border bg-bg-base/30">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-sky-500" />
                  Registrar Nuevo Cliente
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrors({});
                  }}
                  className="p-1.5 rounded-lg hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleRegisterClient} className="p-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                    Nombre o Razón Social <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Restaurante Samaná S.R.L. o Juan Pérez"
                    className={`w-full px-4 py-2.5 bg-bg-base border ${
                      errors.name ? "border-danger focus:border-danger" : "border-border focus:border-sky-500"
                    } rounded-xl focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors`}
                  />
                  {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
                </div>

                {/* RNC o Cédula */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center justify-between">
                    <span>RNC o Cédula</span>
                    <span className="text-[10px] text-text-tertiary font-mono lowercase">RNC (9 dígitos) | Cédula (11 dígitos)</span>
                  </label>
                  <input
                    type="text"
                    value={rnc}
                    onChange={(e) => setRnc(e.target.value)}
                    placeholder="Ej. 1-31-45678-9 o 001-1234567-8"
                    className={`w-full px-4 py-2.5 bg-bg-base border ${
                      errors.rnc ? "border-danger focus:border-danger" : "border-border focus:border-sky-500"
                    } rounded-xl focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors`}
                  />
                  {errors.rnc && <p className="text-xs text-danger mt-1">{errors.rnc}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. 809-538-2345"
                      className={`w-full px-4 py-2.5 bg-bg-base border ${
                        errors.phone ? "border-danger focus:border-danger" : "border-border focus:border-sky-500"
                      } rounded-xl focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors`}
                    />
                    {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone}</p>}
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej. admin@samanamarina.com"
                      className={`w-full px-4 py-2.5 bg-bg-base border ${
                        errors.email ? "border-danger focus:border-danger" : "border-border focus:border-sky-500"
                      } rounded-xl focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors`}
                    />
                    {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                    Notas o Preferencias
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Notas de facturación fiscal o preferencias de mesa..."
                    className="w-full px-4 py-2.5 bg-bg-base border border-border rounded-xl focus:border-sky-500 focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm transition-colors resize-none"
                  />
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-2.5 p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl text-sky-400 text-xs">
                  <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-normal">
                    Los datos fiscales (RNC y WhatsApp) registrados aquí se utilizarán para la emisión y envío automático de comprobantes fiscales de la DGII.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setErrors({});
                    }}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-bg-active text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white shadow-button transition-all text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    {isSubmitting ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
