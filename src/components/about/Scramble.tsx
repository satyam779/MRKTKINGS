import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?'
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)]
const TICK = 25

// Types text in left to right, with a few random characters running just ahead of the cursor.
export function ScrambleIn({ text, delay = 0, triggered = true }: { text: string; delay?: number; triggered?: boolean }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!triggered) return
    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      if (reduce) {
        setShown(text)
        return
      }
      let frame = 0
      interval = window.setInterval(() => {
        frame++
        const cursor = Math.floor(frame * 0.5)
        if (cursor >= text.length) {
          setShown(text)
          window.clearInterval(interval)
          return
        }
        setShown(
          [...text]
            .map((c, i) => (c === ' ' ? ' ' : i < cursor ? c : i < cursor + 3 ? randomChar() : ''))
            .join(''),
        )
      }, TICK)
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [text, delay, triggered, reduce])

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown ?? ' '}</span>
    </>
  )
}
