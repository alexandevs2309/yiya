import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  // Usa flex en el overlay para centrar — no depende del ancho del viewport
                  "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-auto w-full max-w-lg rounded-2xl bg-panel shadow-modal focus:outline-none relative",
                    // Si no se pasa className custom, aplica padding por defecto
                    className ?? "p-6",
                  )}
                >
                  {title && (
                    <Dialog.Title className="text-lg font-semibold text-text-primary mb-1">
                      {title}
                    </Dialog.Title>
                  )}
                  {description && (
                    <Dialog.Description className="text-sm text-text-secondary mb-4">
                      {description}
                    </Dialog.Description>
                  )}
                  {children}
                  <Dialog.Close asChild>
                    <button className="absolute right-4 top-4 rounded-xl p-1 text-text-tertiary hover:text-text-secondary hover:bg-secondary transition-colors z-10">
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
