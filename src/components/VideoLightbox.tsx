import { motion, useMotionValue } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Volume, VolumeOff } from './Icons'

const ease = [0.22, 1, 0.36, 1] as const

const time = (seconds: number) => {
  const s = Math.floor(seconds || 0)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type Props = {
  src: string
  poster?: string
  // Where the preview that opened it was, so it reads as one continuous video.
  startAt: number
  // Width / height of the video. Read off the preview so the panel opens at the right shape.
  ratio?: number
  // Names the dialog for screen readers.
  label: string
  // Plays with sound and shows a mute button. Without it the video is always muted.
  sound?: boolean
  onClose: () => void
}

// Full-size video player opened from a preview: play/pause, progress and, for videos with audio, sound.
export function VideoLightbox({ src, poster, startAt, ratio: initialRatio = 16 / 9, label, sound = false, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(!sound)
  const [duration, setDuration] = useState(0)
  const [ratio, setRatio] = useState(initialRatio)
  const progress = useMotionValue(0)

  // Lock page scroll (unless a popup underneath already has), move focus into the dialog and hand it back to
  // the button that opened it on close.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    const locked = document.body.style.overflow === 'hidden'
    if (!locked) document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (!locked) document.body.style.overflow = ''
      returnTo?.focus({ preventScroll: true })
    }
  }, [])

  // Start on open. The tap that opened the player lets the browser play sound; if it still refuses, fall back
  // to muted so the video at least plays, with the sound button one tap away.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !sound
    video.play().catch(() => {
      if (!sound) return
      video.muted = true
      video.play().catch(() => {})
    })
  }, [sound])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'Tab' && panelRef.current) {
        // Keep keyboard focus inside the dialog.
        const items = panelRef.current.querySelectorAll<HTMLElement>('button')
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Drive the progress bar and clock from the video while it plays.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !playing) return
    let frame = 0
    const tick = () => {
      if (video.duration) progress.set(video.currentTime / video.duration)
      const now = time(video.currentTime)
      if (clockRef.current && clockRef.current.textContent !== now) clockRef.current.textContent = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, progress])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (video) video.muted = !video.muted
  }

  return createPortal(
    <motion.div
      ref={panelRef}
      className="reelbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="reelbox__backdrop" onClick={onClose} aria-hidden="true" />
      <button ref={closeRef} type="button" className="pmodal__close" onClick={onClose} aria-label="Close video">
        <span aria-hidden="true" />
      </button>

      <motion.div
        className="reelbox__panel"
        style={{ '--ratio': ratio } as CSSProperties}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.5, ease }}
      >
        <video
          ref={(v) => {
            videoRef.current = v
            // React only sets `muted` as a property; iOS also wants the attribute before playing on its own.
            if (v && !sound) v.defaultMuted = true
          }}
          src={src}
          poster={poster}
          loop
          playsInline
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget
            video.currentTime = startAt
            setDuration(video.duration)
            if (video.videoWidth && video.videoHeight) setRatio(video.videoWidth / video.videoHeight)
          }}
        />

        <div className="reelbox__bar">
          <div className="reelbox__group">
            <button
              type="button"
              className="reelbox__btn"
              onClick={togglePlay}
              aria-label={playing ? 'Pause video' : 'Play video'}
            >
              {playing ? <Pause size={18} /> : <Play size={16} />}
            </button>
            {sound && (
              <button
                type="button"
                className="reelbox__btn"
                onClick={toggleMute}
                aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                aria-pressed={!muted}
              >
                {muted ? <VolumeOff size={18} /> : <Volume size={18} />}
              </button>
            )}
          </div>
          <span className="reelbox__time">
            <span ref={clockRef}>{time(startAt)}</span> / {time(duration)}
          </span>
        </div>

        <div className="reelbox__progress" aria-hidden="true">
          <motion.span style={{ scaleX: progress }} />
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
