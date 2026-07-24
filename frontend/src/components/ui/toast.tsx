import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore, type ToastVariant } from '@/stores/toast-store'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const variantConfig: Record<ToastVariant, { icon: React.ElementType; border: string; bg: string; text: string }> = {
  success: {
    icon: CheckCircle2,
    border: 'border-[var(--samana)]',
    bg: 'bg-[var(--samana)]/10',
    text: 'text-[var(--samana)]',
  },
  error: {
    icon: XCircle,
    border: 'border-[var(--coral)]',
    bg: 'bg-[var(--coral)]/10',
    text: 'text-[var(--coral)]',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-[var(--sol)]',
    bg: 'bg-[var(--sol)]/10',
    text: 'text-[var(--sol)]',
  },
  info: {
    icon: Info,
    border: 'border-[var(--caribe)]',
    bg: 'bg-[var(--caribe)]/10',
    text: 'text-[var(--caribe)]',
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const config = variantConfig[t.variant]
          const Icon = config.icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border-2 p-4 shadow-lg backdrop-blur-md bg-card',
                config.border, config.bg,
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.text)} />
              <p className="text-sm text-foreground flex-1">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
