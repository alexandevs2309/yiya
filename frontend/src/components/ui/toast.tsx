"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createContext, useContext, useState, useCallback } from "react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

interface ToastContextValue {
  addToast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastPrimitive.Provider swipeDirection="right">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastPrimitive.Root
              key={t.id}
              asChild
              onOpenChange={() => removeToast(t.id)}
              duration={4000}
            >
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-elevated",
                  t.variant === "error"
                    ? "bg-status-billing-bg"
                    : t.variant === "success"
                      ? "bg-status-free-bg"
                      : "bg-panel",
                )}
              >
                <div className="flex-1 min-w-0">
                  <ToastPrimitive.Title className="text-sm font-semibold text-text-primary">
                    {t.title}
                  </ToastPrimitive.Title>
                  {t.description && (
                    <ToastPrimitive.Description className="text-xs text-text-secondary mt-0.5">
                      {t.description}
                    </ToastPrimitive.Description>
                  )}
                </div>
                <ToastPrimitive.Close className="shrink-0 rounded-lg p-1 text-text-tertiary hover:text-text-secondary">
                  <X className="h-4 w-4" />
                </ToastPrimitive.Close>
              </motion.div>
            </ToastPrimitive.Root>
          ))}
        </AnimatePresence>
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
