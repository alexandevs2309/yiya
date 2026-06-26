import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { UtensilsCrossed, LogIn, Lock, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import FloatingBubblesBackground from "@/components/ui/floating-bubbles-bg";
import SlidingTabs from "@/components/ui/sliding-tabs";

const tabOptions = [
  { id: "pin", label: "PIN Rápido", icon: <Lock className="h-3.5 w-3.5" /> },
  { id: "login", label: "Usuario", icon: <User className="h-3.5 w-3.5" /> },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "pin">("pin");
  const [pin, setPin] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { addToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      setAuth(res.data.user, res.data.access, res.data.refresh, res.data.permissions);
      addToast({
        title: `¡Bienvenido, ${res.data.user.first_name}!`,
        description: `Sesión iniciada como ${res.data.user.role === "admin" ? "Administrador" : "Personal"}.`,
      });
      navigate(res.data.default_route || "/tables");
    } catch {
      addToast({ title: "Error de acceso", description: "Usuario o contraseña incorrectos", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (pinValue?: string) => {
    const pinToSubmit = pinValue || pin;
    if (pinToSubmit.length !== 4) return;
    setLoading(true);
    try {
      const res = await authService.pinLogin(pinToSubmit);
      setAuth(res.data.user, res.data.access, res.data.refresh, res.data.permissions);
      addToast({
        title: `¡Hola, ${res.data.user.first_name}!`,
        description: `Ingresando con PIN.`,
      });
      navigate(res.data.default_route || "/tables");
    } catch {
      addToast({ title: "Acceso denegado", description: "El PIN ingresado es incorrecto", variant: "error" });
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit PIN when it reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      handlePinLogin(pin);
    }
  }, [pin]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !loading) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !loading) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-text-primary px-4 relative overflow-hidden bg-neutral-950">
      <FloatingBubblesBackground />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm z-10"
      >
        {/* Header Branding */}
        <motion.div variants={childVariants} className="mb-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface border border-border shadow-card text-sky-400 relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 opacity-100 transition-opacity" />
            <UtensilsCrossed className="h-7 w-7 relative z-10 text-sky-400 group-hover:rotate-12 transition-transform duration-300" />
          </motion.div>
          <motion.p
            variants={childVariants}
            className="text-xs font-semibold text-text-secondary uppercase tracking-widest flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3 text-sky-400" />
            {getGreeting()}
          </motion.p>
          <motion.h1
            variants={childVariants}
            className="text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent"
          >
            D' Yiya POS
          </motion.h1>
          <motion.p
            variants={childVariants}
            className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mt-1"
          >
            Samaná, República Dominicana
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          variants={childVariants}
          className="rounded-2xl border border-border bg-bg-surface shadow-modal overflow-hidden"
        >
          {/* Custom Tabs */}
          <SlidingTabs
            options={tabOptions}
            activeId={mode}
            onChange={(id) => {
              setMode(id as "login" | "pin");
              setPin("");
              setUsername("");
              setPassword("");
            }}
            className="rounded-none border-x-0 border-t-0 border-b border-border/50 p-1 bg-bg-base/20"
          />

          <div className="p-6">
            <AnimatePresence mode="wait">
              {mode === "pin" ? (
                <motion.div
                  key="pin-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* PIN dots */}
                  <div className="flex justify-center gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        initial={false}
                        animate={
                          pin.length >= i
                            ? { scale: [1, 1.15, 1], borderColor: "#3B82F6" }
                            : { scale: 1, borderColor: "#2D3148" }
                        }
                        transition={{ duration: 0.12 }}
                        className={cn(
                          "flex h-13 w-13 items-center justify-center rounded-xl border-2 text-xl transition-all duration-150 shadow-inner font-black",
                          pin.length >= i
                            ? "bg-sky-500/20 text-sky-400 border-sky-500"
                            : "bg-bg-base/80 text-text-muted border-border",
                        )}
                      >
                        {pin.length >= i ? "●" : "•"}
                      </motion.div>
                    ))}
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <motion.button
                        key={n}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleKeyPress(n.toString())}
                        disabled={loading}
                        className="h-14 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-lg font-bold text-text-primary active:scale-95 shadow-card transition-colors flex items-center justify-center disabled:opacity-50"
                      >
                        {n}
                      </motion.button>
                    ))}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={handleBackspace}
                      disabled={loading}
                      className="h-14 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-lg font-bold text-text-secondary transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      ⌫
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleKeyPress("0")}
                      disabled={loading}
                      className="h-14 rounded-xl border border-border bg-bg-elevated hover:bg-bg-active text-lg font-bold text-text-primary shadow-card transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      0
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      disabled={pin.length !== 4 || loading}
                      onClick={() => handlePinLogin()}
                      className="h-14 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white shadow-button transition-all flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <LogIn className="h-5 w-5" />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="user-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      placeholder="Ingrese usuario..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-border bg-bg-base px-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-sky-500 focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-border bg-bg-base px-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-sky-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !username.trim() || !password.trim()}
                    className="w-full h-12 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white shadow-button mt-2"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p
          variants={childVariants}
          className="mt-8 text-center text-[10px] text-text-tertiary uppercase tracking-widest font-semibold"
        >
          © 2026 D' Yiya Restaurants • Samaná
        </motion.p>
      </motion.div>
    </div>
  );
}
