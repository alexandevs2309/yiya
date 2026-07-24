import { type ReactNode, forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  children: ReactNode
  snap: 'collapsed' | 'half' | 'expanded'
}

export const BottomSheetContent = forwardRef<HTMLDivElement, Props>(
  function BottomSheetContent({ children, snap }, ref) {
    const isCollapsed = snap === 'collapsed'

    return (
      <div
        ref={ref}
        className="flex-1 overflow-hidden flex flex-col min-h-0"
      >
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-auto flex flex-col min-h-0"
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  },
)
