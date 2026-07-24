import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useBottomSheetStore } from './bottom-sheet-store'
import { useBottomSheet } from './useBottomSheet'
import { BottomSheetHandle } from './BottomSheetHandle'
import { BottomSheetBackdrop } from './BottomSheetBackdrop'
import { BottomSheetContent } from './BottomSheetContent'

interface Props {
  children: ReactNode
}

export function BottomSheet({ children }: Props) {
  const { isOpen, snap, close } = useBottomSheetStore()
  const { y, sheetRef, contentRef, sheetHeight, handleDragEnd } = useBottomSheet()

  if (!isOpen) return null

  const isFullyVisible = snap !== 'collapsed'

  const sheet = (
    <>
      <BottomSheetBackdrop visible={isFullyVisible} onTap={close} />

      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: sheetHeight - 80 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{
          y,
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${sheetHeight}px`,
          zIndex: 50,
        }}
        className="bg-card rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] flex flex-col will-change-transform overflow-hidden"
      >
        <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <BottomSheetHandle />
        </div>

        <BottomSheetContent ref={contentRef} snap={snap}>
          {children}
        </BottomSheetContent>
      </motion.div>
    </>
  )

  return createPortal(sheet, document.body)
}

BottomSheet.displayName = 'BottomSheet'
