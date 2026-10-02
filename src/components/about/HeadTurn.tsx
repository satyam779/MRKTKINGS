import { useEffect, useRef, useState } from 'react'
import { about } from '../../content'

const { path, count, center, width, height } = about.turn
const frameSrc = (i: number) => `${path}${String(i).padStart(2, '0')}.webp`

// Facing-camera frame first, then every 16th, 8th, 4th... so the turn works early and fills in.
function loadOrder() {
  const order = [center]
  for (let step = 16; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i)
  }
  return order
}

/**
 * Cut-out head turn drawn frame by frame on a canvas (instant, unlike seeking a video).
 * With a mouse he turns to look at the cursor; on touch screens he slowly looks side to side.
 * Reduced motion keeps the still, facing-camera frame.
 */
export function HeadTurn() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const follow = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const frames: (HTMLImageElement | undefined)[] = []
    let current = center
    let target = center
    let drawn = -1
    let visible = true
    let raf = 0
    let cancelled = false

    const nearest = (i: number) => {
      for (let d = 0; d < count; d++) {
        if (frames[i - d]) return i - d
        if (frames[i + d]) return i + d
      }
      return -1
    }
    const draw = () => {
      const n = nearest(Math.round(current))
      if (n < 0 || n === drawn) return
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(frames[n]!, 0, 0)
      drawn = n
    }
    // Share of the range left (s < 0) or right (s > 0) of the facing-camera frame.
    const toFrame = (s: number) => center + s * (s < 0 ? center : count - 1 - center)

    const tick = (t: number) => {
      raf = 0
      if (!follow) target = toFrame(Math.sin(t / 1600) * 0.6)
      current += (target - current) * 0.12
      draw()
      if (!follow || Math.abs(target - current) > 0.05) start()
    }
    const start = () => {
      if (!raf && visible && frames[center]) raf = requestAnimationFrame(tick)
    }

    // Where the cursor sits relative to his face: -1 at the window's left edge, 1 at the right.
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const dx = e.clientX - cx
      target = toFrame(dx < 0 ? dx / Math.max(cx, 1) : dx / Math.max(window.innerWidth - cx, 1))
      start()
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    observer.observe(canvas)
    if (follow) window.addEventListener('pointermove', onMove)

    for (const i of loadOrder()) {
      const img = new Image()
      img.src = frameSrc(i)
      img
        .decode()
        .then(() => {
          if (cancelled) return
          frames[i] = img
          // A closer frame may have just arrived; the still stays up until the canvas has the real one.
          draw()
          if (i === center) {
            setLive(true)
            start()
          }
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <>
      {!live && <img className="about-hero__turn" src={frameSrc(center)} alt="" width={width} height={height} fetchPriority="high" />}
      <canvas
        ref={canvasRef}
        className={`about-hero__turn ${live ? '' : 'is-pending'}`}
        width={width}
        height={height}
        aria-hidden="true"
      />
    </>
  )
}
