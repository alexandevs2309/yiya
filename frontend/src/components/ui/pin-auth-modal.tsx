import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, Loader2 } from 'lucide-react'
import { Button } from './button'
import { api } from '@/services/api'

interface PinAuthModalProps {
  open: boolean
  onClose: () => void
  onAuthorized: () => void
  title?: string
  description?: string
}

export function PinAuthModal({ open, onClose, onAuthorized, title = 'Autorización Requerida', description = 'Esta acción requiere confirmación de un Administrador.' }: PinAuthModalProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num)
      setError('')
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleVerify = async () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos')
      return
    }
    setLoading(true)
    try {
      const res: any = await api('/auth/users/verify-admin-pin/', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      if (res.valid) {
        onAuthorized()
        handleClear()
        onClose()
      } else {
        setError('PIN de Administrador inválido')
        setPin('')
      }
    } catch {
      setError('Error al validar PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl relative overflow-hidden z-10 p-6 space-y-6"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-semibold text-lg font-heading">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border border-border transition-colors ${
                    i < pin.length ? 'bg-primary border-primary' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-destructive text-center font-medium animate-pulse">
                {error}
              </p>
            )}

            {/* Touch Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <Button
                  key={num}
                  variant="outline"
                  onClick={() => handleKeyPress(num)}
                  className="h-12 text-lg font-semibold font-number rounded-xl"
                  disabled={loading}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="ghost"
                onClick={handleClear}
                className="h-12 text-xs font-medium text-muted-foreground rounded-xl"
                disabled={loading}
              >
                Limpiar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleKeyPress('0')}
                className="h-12 text-lg font-semibold font-number rounded-xl"
                disabled={loading}
              >
                0
              </Button>
              <Button
                variant="ghost"
                onClick={handleBackspace}
                className="h-12 text-sm font-medium rounded-xl text-muted-foreground"
                disabled={loading}
              >
                Borrar
              </Button>
            </div>

            <Button
              size="lg"
              className="w-full text-base gap-2 rounded-xl"
              onClick={handleVerify}
              disabled={loading || pin.length < 4}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Autorizar'
              )}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
