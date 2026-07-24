import { motion } from 'framer-motion'

interface Props {
  visible: boolean
  onTap: () => void
}

export function BottomSheetBackdrop({ visible, onTap }: Props) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 0.4 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      onClick={onTap}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 40,
      }}
    />
  )
}
