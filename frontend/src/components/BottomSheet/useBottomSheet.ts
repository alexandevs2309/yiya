import { useRef, useCallback, useEffect, useState } from 'react'
import { useMotionValue, animate, type PanInfo } from 'framer-motion'
import { useBottomSheetStore, type SnapPoint } from './bottom-sheet-store'

const COLLAPSED_HEIGHT = 80
const HALF_RATIO = 0.45
const EXPANDED_RATIO = 0.9
const VELOCITY_THRESHOLD = 500

const SPRING = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
  mass: 0.8,
}

function getSnapY(snap: SnapPoint, sheetHeight: number): number {
  switch (snap) {
    case 'expanded':
      return 0
    case 'half':
      return sheetHeight - window.innerHeight * HALF_RATIO
    case 'collapsed':
      return sheetHeight - COLLAPSED_HEIGHT
  }
}

function getNearestSnap(currentY: number, sheetHeight: number): SnapPoint {
  const snaps: [SnapPoint, number][] = [
    ['expanded', getSnapY('expanded', sheetHeight)],
    ['half', getSnapY('half', sheetHeight)],
    ['collapsed', getSnapY('collapsed', sheetHeight)],
  ]
  return snaps.reduce((a, b) =>
    Math.abs(a[1] - currentY) < Math.abs(b[1] - currentY) ? a : b
  )[0]
}

export function useBottomSheet() {
  const { isOpen, snap, open, close, setSnap } = useBottomSheetStore()
  const y = useMotionValue(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [sheetHeight, setSheetHeight] = useState(window.innerHeight * EXPANDED_RATIO)

  useEffect(() => {
    const onResize = () => setSheetHeight(window.innerHeight * EXPANDED_RATIO)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const targetY = getSnapY(snap, sheetHeight)
      y.set(targetY)
      if (snap === 'collapsed') {
        animate(y, getSnapY('half', sheetHeight), SPRING)
        setSnap('half')
      }
    }
  }, [isOpen, sheetHeight, y, setSnap])

  const animateToSnap = useCallback(
    (targetSnap: SnapPoint) => {
      const targetY = getSnapY(targetSnap, sheetHeight)
      animate(y, targetY, SPRING)
      setSnap(targetSnap)
    },
    [y, sheetHeight, setSnap],
  )

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const velocity = info.velocity.y
      const currentY = y.get()
      let targetSnap: SnapPoint

      if (velocity > VELOCITY_THRESHOLD) {
        targetSnap = snap === 'expanded' ? 'half' : 'collapsed'
      } else if (velocity < -VELOCITY_THRESHOLD) {
        targetSnap = 'expanded'
      } else {
        targetSnap = getNearestSnap(currentY, sheetHeight)
      }

      animateToSnap(targetSnap)
    },
    [y, sheetHeight, snap, animateToSnap],
  )

  const handleOpen = useCallback(() => {
    open()
    y.set(getSnapY('collapsed', sheetHeight))
    animateToSnap('half')
  }, [open, y, sheetHeight, animateToSnap])

  const handleClose = useCallback(() => {
    animate(y, getSnapY('collapsed', sheetHeight), {
      ...SPRING,
      onComplete: () => close(),
    })
  }, [y, sheetHeight, close])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (snap !== 'collapsed' && isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [snap, isOpen])

  return {
    y,
    snap,
    isOpen,
    sheetRef,
    contentRef,
    sheetHeight,
    handleDragEnd,
    handleOpen,
    handleClose,
    animateToSnap,
  }
}
