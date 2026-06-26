import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

const IDLE_TIMEOUT = 600; // segundos
const WARN_THRESHOLD = 60; // segundos antes del logout
const EVENTS: (keyof WindowEventMap)[] = ["mousemove", "keydown", "touchstart", "scroll"];

export function useIdleTimer() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState(IDLE_TIMEOUT);
  const [showWarning, setShowWarning] = useState(false);
  const counterRef = useRef(IDLE_TIMEOUT);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    counterRef.current = IDLE_TIMEOUT;
    setShowWarning(false);
  }, []);

  useEffect(() => {
    // Solo activo con usuario autenticado
    if (!user) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const handleActivity = () => reset();

    EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    intervalRef.current = setInterval(() => {
      counterRef.current -= 1;
      setTimeLeft(counterRef.current);

      if (counterRef.current < WARN_THRESHOLD) {
        setShowWarning(true);
      }

      if (counterRef.current <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Log antes de hacer logout (best-effort — no bloquea si falla)
        import("@/services/auth.service").then(({ authService }) => {
          authService.logout().catch(() => {});
        });
        logout();
        navigate("/login");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [user, logout, navigate, reset]);

  return { timeLeft, showWarning };
}
