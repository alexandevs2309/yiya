import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { menuService } from "@/services/menu.service";
import { tablesService } from "@/services/tables.service";
import { authService } from "@/services/auth.service";
import {
  User,
  Building2,
  ListFilter,
  ChevronRight,
  LogOut,
  Save,
  Search,
  DollarSign,
  TableProperties,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Phone,
  Mail,
  Shield,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatRD } from "@/lib/utils";
import type { MenuItem, Table, Category, User as UserType } from "@/lib/types";

type ActiveTab = "perfil" | "menu" | "mesas" | "restaurante" | "usuarios";

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

const SESSION_COLORS = [
  { value: "#0EA5E9", label: "Azul Caribe" },
  { value: "#10B981", label: "Verde Samaná" },
  { value: "#F43F5E", label: "Coral Yiya" },
  { value: "#F97316", label: "Naranja Sol" },
  { value: "#8B5CF6", label: "Violeta Bahía" },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("perfil");

  // Menu items list state for editing
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  
  // Tables state
  const [tables, setTables] = useState<Table[]>([]);
  
  // General Restaurant State (saved locally/mocked)
  const [restDetails, setRestDetails] = useState(() => {
    try {
      const saved = localStorage.getItem("diyiya_restaurant");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: "D' Yiya Samaná",
      rnc: "1-31-45678-9",
      phone: "809-538-2345",
      address: "Av. La Marina, Samaná, RD",
    };
  });

  const [savingItem, setSavingItem] = useState<string | null>(null);

  // User Management State (CRUD)
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // User Form Fields
  const [userUsername, setUserUsername] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userRole, setUserRole] = useState<UserType["role"]>("waitress");
  const [userSessionColor, setUserSessionColor] = useState("#0EA5E9");
  const [userPin, setUserPin] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userIsActive, setUserIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTab === "menu") {
      loadMenuData();
    } else if (activeTab === "mesas") {
      loadTables();
    } else if (activeTab === "usuarios" && user?.role === "admin") {
      loadUsers();
    }
  }, [activeTab]);

  const loadMenuData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        menuService.listCategories(),
        menuService.listItems(),
      ]);
      setCategories(catRes.data.results || catRes.data);
      setMenuItems(itemRes.data.results || itemRes.data);
    } catch {
      addToast({ title: "Error", description: "No se pudo cargar el menú", variant: "error" });
    }
  };

  const loadTables = async () => {
    try {
      const res = await tablesService.list();
      setTables(res.data.results || res.data);
    } catch {
      addToast({ title: "Error", description: "No se pudieron cargar las mesas", variant: "error" });
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authService.listUsers();
      setUsers(res.data.results || res.data);
    } catch {
      addToast({ title: "Error", description: "No se pudo cargar la lista de personal", variant: "error" });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    setSavingItem(item.id);
    const newStatus = !item.available_today;
    try {
      await menuService.updateItem(item.id, { available_today: newStatus });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available_today: newStatus } : i))
      );
      addToast({
        title: "Actualizado",
        description: `${item.name} ahora está ${newStatus ? "disponible" : "agotado"}`,
      });
    } catch {
      addToast({ title: "Error", description: "No se pudo actualizar el estado", variant: "error" });
    } finally {
      setSavingItem(null);
    }
  };

  const handlePriceTodayChange = async (item: MenuItem, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) return;
    
    setSavingItem(item.id);
    try {
      await menuService.updateItem(item.id, { price_today: newPrice });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, price_today: newPrice, effective_price: newPrice } : i))
      );
      addToast({
        title: "Precio actualizado",
        description: `Precio de hoy para ${item.name} es ${formatRD(newPrice)}`,
      });
    } catch {
      addToast({ title: "Error", description: "No se pudo actualizar el precio", variant: "error" });
    } finally {
      setSavingItem(null);
    }
  };

  const handleSaveRestDetails = () => {
    localStorage.setItem("diyiya_restaurant", JSON.stringify(restDetails));
    addToast({
      title: "Guardado",
      description: "Los detalles del restaurante se actualizaron correctamente",
    });
  };

  // Open modal to add or edit user
  const handleOpenUserModal = (editUser: UserType | null = null) => {
    setSelectedUser(editUser);
    setFormErrors({});
    if (editUser) {
      setUserUsername(editUser.username);
      setUserFirstName(editUser.first_name);
      setUserLastName(editUser.last_name);
      setUserEmail(editUser.email);
      setUserPhone(editUser.phone);
      setUserRole(editUser.role);
      setUserSessionColor(editUser.session_color || "#0EA5E9");
      setUserPin(""); // PIN must not be pre-filled
      setUserPassword(""); // Password must not be pre-filled
      setUserIsActive(editUser.is_active);
    } else {
      setUserUsername("");
      setUserFirstName("");
      setUserLastName("");
      setUserEmail("");
      setUserPhone("");
      setUserRole("waitress");
      setUserSessionColor("#0EA5E9");
      setUserPin("");
      setUserPassword("");
      setUserIsActive(true);
    }
    setIsUserModalOpen(true);
  };

  // Handle Save (Create / Update) User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!userUsername.trim()) errors.username = "El usuario es obligatorio.";
    if (!userFirstName.trim()) errors.first_name = "El nombre es obligatorio.";
    if (!selectedUser && !userPassword) errors.password = "La contraseña es obligatoria para nuevos usuarios.";
    if (userPin && (userPin.length < 4 || userPin.length > 6 || !/^\d+$/.test(userPin))) {
      errors.pin = "El PIN debe ser numérico de 4 a 6 dígitos.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: Record<string, any> = {
      username: userUsername.trim(),
      first_name: userFirstName.trim(),
      last_name: userLastName.trim(),
      email: userEmail.trim(),
      phone: userPhone.trim(),
      role: userRole,
      session_color: userSessionColor,
      is_active: userIsActive,
    };

    if (userPassword) payload.password = userPassword;
    if (userPin) payload.pin = userPin;

    try {
      if (selectedUser) {
        await authService.patchUser(selectedUser.id, payload);
        addToast({ title: "Personal Actualizado", description: `Se guardaron los cambios de ${userFirstName}` });
      } else {
        await authService.createUser(payload);
        addToast({ title: "Personal Registrado", description: `Se registró a ${userFirstName} en el sistema` });
      }
      setIsUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      const data = err.response?.data;
      // Mostrar el primer error de validación que devuelva el backend
      const errMsg = data
        ? Object.entries(data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
            .join(" | ")
        : "No se pudo guardar la información del usuario.";
      addToast({ title: "Error al guardar", description: errMsg, variant: "error" });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (user?.id === id) {
      addToast({ title: "Operación no válida", description: "No puedes eliminar tu propio usuario activo.", variant: "error" });
      return;
    }
    if (confirm(`¿Estás seguro de que deseas eliminar a "${name}" del personal?`)) {
      try {
        await authService.deleteUser(id);
        addToast({ title: "Personal Eliminado", description: `Se eliminó a ${name} de la base de datos.` });
        loadUsers();
      } catch {
        addToast({ title: "Error", description: "No se pudo eliminar al usuario.", variant: "error" });
      }
    }
  };

  // Filter menu items
  const filteredItems = useMemo((): MenuItem[] => {
    return menuItems.filter((i) => {
      if (selectedCat && i.category !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCat, searchQuery]);

  return (
    <div className="flex h-full overflow-hidden bg-bg-base text-text-primary">
      {/* Side Menu Tab Selector */}
      <aside className="w-56 shrink-0 bg-bg-surface border-r border-border flex flex-col p-4 space-y-1">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider px-3 mb-3">
          Ajustes POS
        </h2>
        {[
          { id: "perfil", label: "Perfil de Usuario", icon: User, visible: true },
          { id: "usuarios", label: "Gestionar Personal", icon: Users, visible: user?.role === "admin" },
          { id: "menu", label: "Administrar Menú", icon: ListFilter, visible: true },
          { id: "mesas", label: "Gestión de Mesas", icon: TableProperties, visible: true },
          { id: "restaurante", label: "Datos Restaurante", icon: Building2, visible: true },
        ].filter(t => t.visible).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold rounded-lg transition-colors text-left ${
              activeTab === tab.id
                ? "bg-bg-active text-text-primary border-l-2 border-sky-500 pl-2.5"
                : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}

        <div className="pt-6 mt-6 border-t border-border">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold rounded-lg text-danger/85 hover:bg-danger/10 hover:text-danger transition-colors text-left"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-text-primary capitalize">
            {activeTab === "usuarios" ? "Gestionar Personal" : activeTab}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {activeTab === "perfil"
              ? "Gestiona tus datos personales y PIN de acceso rápido"
              : activeTab === "usuarios"
                ? "Administra las cuentas de meseros, cocineros y credenciales de acceso fiscal"
                : activeTab === "menu"
                  ? "Actualiza precios del día (mariscos) y disponibilidad del menú"
                  : activeTab === "mesas"
                    ? "Consulta el estado y capacidad de las mesas"
                    : "Configura el nombre comercial, RNC de la DGII y teléfono"}
          </p>
        </div>

        {/* Tab Viewport */}
        <div className="flex-1 bg-bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === "perfil" && (
              <motion.div
                key="perfil"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={fastTransition}
                className="p-5 space-y-6 flex-1 overflow-y-auto scrollbar-thin"
              >
                <div className="flex items-center gap-4 rounded-xl bg-bg-elevated/20 border border-border/40 p-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-inner"
                    style={{ backgroundColor: user?.session_color || "#3B82F6" }}
                  >
                    {user?.first_name?.charAt(0) || user?.username?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {user?.first_name} {user?.last_name}
                    </h3>
                    <p className="text-[10px] text-text-muted capitalize mt-0.5">
                      Rol: {user?.role === "admin" ? "Administrador" : user?.role === "cook" ? "Cocinero" : "Mesera"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-w-md">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Detalles de cuenta
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs py-2 border-b border-border/45">
                      <span className="text-text-secondary">Usuario</span>
                      <span className="font-bold text-text-primary">{user?.username}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-border/45">
                      <span className="text-text-secondary">Email</span>
                      <span className="font-bold text-text-primary">{user?.email || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-border/45">
                      <span className="text-text-secondary">Rol</span>
                      <span className="font-bold text-text-primary capitalize">{user?.role}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "usuarios" && (
              <motion.div
                key="usuarios"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={fastTransition}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Header list controls */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-bg-elevated/10 shrink-0">
                  <span className="text-xs font-bold text-text-secondary">
                    {users.length} Empleados registrados
                  </span>
                  <button
                    onClick={() => handleOpenUserModal(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg shadow-button transition-all active:scale-95"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Registrar Personal
                  </button>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {loadingUsers ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="rounded-xl border border-border bg-bg-elevated/10 hover:border-border-strong transition-all p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{ backgroundColor: u.session_color || "#3B82F6" }}
                              >
                                {u.first_name?.charAt(0) || u.username.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-text-primary truncate">
                                  {u.first_name} {u.last_name}
                                </h4>
                                <span className="text-[10px] text-text-tertiary block mt-0.5">
                                  @{u.username}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-[11px] text-text-secondary border-t border-border/40 pt-2.5">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-text-tertiary" />
                                <span className="capitalize font-semibold text-sky-400">
                                  {u.role === "admin" ? "Administrador" : u.role === "cook" ? "Cocinero" : u.role === "waitress" ? "Mesera" : "Utility"}
                                </span>
                              </div>
                              {u.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-text-tertiary" />
                                  <span>{u.phone}</span>
                                </div>
                              )}
                              {u.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                                  <span className="truncate">{u.email}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-border/40">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                u.is_active
                                  ? "bg-success/10 text-success border border-success/20"
                                  : "bg-danger/10 text-danger border border-danger/20"
                              }`}
                            >
                              {u.is_active ? "Activo" : "Inactivo"}
                            </span>

                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.first_name)}
                                disabled={user?.id === u.id}
                                className="p-1.5 rounded-lg bg-bg-elevated hover:bg-danger/10 text-text-secondary hover:text-danger disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={fastTransition}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-elevated/10 shrink-0">
                  <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-thin">
                    <button
                      onClick={() => setSelectedCat(null)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        !selectedCat ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCat(c.id)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          selectedCat === c.id ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar platos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8.5 w-full rounded-xl bg-bg-elevated pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted border border-border focus:border-accent outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item: MenuItem) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-bg-elevated/20 p-4 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-text-primary truncate">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-text-tertiary line-clamp-1 mt-0.5 capitalize">
                              {item.description || item.category}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            disabled={savingItem === item.id}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              item.available_today ? "bg-success" : "bg-bg-elevated"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                item.available_today ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/45 pt-3">
                          <span className="text-[10px] text-text-muted font-bold">Precio hoy:</span>
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <div className="relative">
                              <DollarSign className="absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                              <input
                                type="number"
                                defaultValue={item.price_today || item.price_base}
                                onBlur={(e) => handlePriceTodayChange(item, e.target.value)}
                                className="h-7 w-20 rounded bg-bg-elevated pl-5 pr-1.5 text-xs text-text-primary border border-border focus:border-accent outline-none font-bold text-right"
                              />
                            </div>
                            {savingItem === item.id && (
                              <div className="h-3 w-3 animate-spin rounded-full border border-accent border-t-transparent shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "mesas" && (
              <motion.div
                key="mesas"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={fastTransition}
                className="p-5 flex-1 overflow-y-auto scrollbar-thin"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-border bg-bg-elevated/20 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-active text-text-primary text-sm font-extrabold border border-border">
                          {t.number}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-text-primary">
                            Mesa #{t.number}
                          </h4>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Zona: {t.zone_name || "General"} · Cap: {t.capacity || 4}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          t.status === "free"
                            ? "bg-success/15 text-success"
                            : t.status === "occupied"
                              ? "bg-[#F97316]/10 text-[#F97316]"
                              : "bg-warning/15 text-warning"
                        }`}
                      >
                        {t.status === "free" ? "Libre" : t.status === "occupied" ? "En curso" : "Cuenta"}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "restaurante" && (
              <motion.div
                key="restaurante"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={fastTransition}
                className="p-5 space-y-4 max-w-md flex-1 overflow-y-auto scrollbar-thin"
              >
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                  Datos Fiscales & Contacto
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Nombre del restaurante
                    </label>
                    <input
                      type="text"
                      value={restDetails.name}
                      onChange={(e) => setRestDetails({ ...restDetails, name: e.target.value })}
                      className="h-9 w-full rounded-lg bg-bg-elevated px-3 text-xs text-text-primary border border-border focus:border-accent outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      RNC Fiscal (DGII Ley 32-23)
                    </label>
                    <input
                      type="text"
                      value={restDetails.rnc}
                      onChange={(e) => setRestDetails({ ...restDetails, rnc: e.target.value })}
                      className="h-9 w-full rounded-lg bg-bg-elevated px-3 text-xs text-text-primary border border-border focus:border-accent outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={restDetails.phone}
                      onChange={(e) => setRestDetails({ ...restDetails, phone: e.target.value })}
                      className="h-9 w-full rounded-lg bg-bg-elevated px-3 text-xs text-text-primary border border-border focus:border-accent outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={restDetails.address}
                      onChange={(e) => setRestDetails({ ...restDetails, address: e.target.value })}
                      className="h-9 w-full rounded-lg bg-bg-elevated px-3 text-xs text-text-primary border border-border focus:border-accent outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveRestDetails}
                    className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover px-5 text-xs font-bold text-white transition-all shadow-button active:scale-[0.98]"
                  >
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Register/Edit Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={fastTransition}
              className="w-full max-w-lg bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-border bg-bg-base/30">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-sky-400" />
                  {selectedUser ? "Editar Datos de Personal" : "Registrar Nuevo Personal"}
                </h3>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveUser} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Nombre <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFirstName}
                      onChange={(e) => setUserFirstName(e.target.value)}
                      placeholder="Ej. Carmen"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>

                  {/* Apellido */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={userLastName}
                      onChange={(e) => setUserLastName(e.target.value)}
                      placeholder="Ej. Rosario"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Usuario */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Usuario de Acceso <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!selectedUser}
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                      placeholder="Ej. carmen.pos"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 disabled:opacity-50 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                    {formErrors.username && <p className="text-[10px] text-danger mt-1">{formErrors.username}</p>}
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Rol del Empleado <span className="text-danger">*</span>
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as UserType["role"])}
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary transition-colors cursor-pointer"
                    >
                      <option value="waitress">Mesera / POS</option>
                      <option value="cook">Cocinero / Cocina</option>
                      <option value="admin">Administrador</option>
                      <option value="utility">Utility / Limpieza</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Teléfono */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="Ej. 829-555-4321"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Ej. carmen@diyiya.com"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Contraseña {selectedUser ? "(Dejar en blanco para no cambiar)" : <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Ej. contraseña_segura"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                    {formErrors.password && <p className="text-[10px] text-danger mt-1">{formErrors.password}</p>}
                  </div>

                  {/* PIN */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1 flex justify-between">
                      <span>PIN Rápido</span>
                      <span className="text-[9px] text-text-tertiary">4 a 6 dígitos</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={userPin}
                      onChange={(e) => setUserPin(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Ej. 2580"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                    {formErrors.pin && <p className="text-[10px] text-danger mt-1">{formErrors.pin}</p>}
                  </div>
                </div>

                {/* Color de sesión picker */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Color Identificador de Sesión
                  </label>
                  <div className="flex gap-3">
                    {SESSION_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setUserSessionColor(c.value)}
                        className={`h-7 w-7 rounded-full transition-transform active:scale-90 border relative ${
                          userSessionColor === c.value
                            ? "scale-110 border-white shadow-inner"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      >
                        {userSessionColor === c.value && (
                          <Check className="h-3.5 w-3.5 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch de Estado Activo */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-base/50 border border-border/50">
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">Usuario Activo</h5>
                    <p className="text-[10px] text-text-tertiary">Permitir el acceso al POS y la cocina</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserIsActive(!userIsActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      userIsActive ? "bg-success" : "bg-bg-elevated"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        userIsActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-bg-active text-text-secondary hover:text-text-primary transition-all text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold transition-all text-xs shadow-button"
                  >
                    {selectedUser ? "Guardar Cambios" : "Crear Usuario"}
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
