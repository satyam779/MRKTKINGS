import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'framer-motion'
import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import { media } from '../../content'
import { useMediaQuery } from '../../useMediaQuery'

// Swaps the mouse pointer for the MRKTKings crown while it is over `area`.
// The crown sits exactly on the pointer (no lag) and tips side to side as it moves,
// settling with a little wobble. Touch screens keep their normal behaviour.
export function CrownCursor({ area }: { area: RefObject<HTMLElement | null> }) {
  const mouse = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(false)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const tilt = useTransform(useVelocity(x), [-1600, 0, 1600], [-24, 0, 24], { clamp: true })
  const rotate = useSpring(tilt, { stiffness: 320, damping: 11, mass: 0.6 })

  useEffect(() => {
    const el = area.current
    if (!mouse || !el) return
    el.classList.add('has-crown-cursor')
    let last = { x: -1, y: -1 }

    const inside = (px: number, py: number) => {
      const r = el.getBoundingClientRect()
      return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      last = { x: e.clientX, y: e.clientY }
      x.set(e.clientX)
      y.set(e.clientY)
      setShown(true)
    }
    const onLeave = () => {
      setShown(false)
      setPressed(false)
    }
    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    // Scrolling moves the hero under a still mouse; hide the crown once the pointer is no longer over it.
    const onScroll = () => {
      if (!inside(last.x, last.y)) setShown(false)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.classList.remove('has-crown-cursor')
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('scroll', onScroll)
    }
  }, [mouse, area, x, y])

  if (!mouse) return null

  return (
    <motion.div className="crown-cursor" aria-hidden="true" style={{ x, y, rotate: reduce ? 0 : rotate }}>
      <motion.img
        src={media.crown}
        alt=""
        width={44}
        height={44}
        draggable={false}
        initial={false}
        animate={{ scale: shown ? (pressed ? 0.8 : 1) : 0, opacity: shown ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      />
    </motion.div>
  )
}
