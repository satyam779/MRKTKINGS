import { useEffect } from 'react'
import type { RefObject } from 'react'

const gestures = ['touchend', 'click', 'keydown'] as const

// Plays a muted, inline video while `active` and pauses it otherwise.
// Phones can refuse autoplay (iOS Low Power Mode, data saver), so a refused play is
// retried on the visitor's next tap or key press instead of leaving the video frozen.
export function useAutoplay(ref: RefObject<HTMLVideoElement | null>, active: boolean) {
  useEffect(() => {
    const video = ref.current
    if (!video) return
    // React only sets `muted` as a property. iOS Safari also looks for the `muted`
    // attribute before it allows a video to start on its own.
    video.defaultMuted = true
    if (!active) {
      video.pause()
      return
    }

    let cancelled = false
    const stop = () => gestures.forEach((g) => window.removeEventListener(g, retry))
    const retry = () => {
      video.play().then(stop, () => {})
    }
    video.play().catch(() => {
      if (!cancelled) gestures.forEach((g) => window.addEventListener(g, retry, { passive: true }))
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [ref, active])
}
