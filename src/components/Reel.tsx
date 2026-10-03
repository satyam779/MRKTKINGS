import { motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { intro, media } from '../content'
import { Pause, Play, SoundOff, SoundOn } from './Icons'

const time = (seconds: number) => {
  const s = Math.floor(seconds || 0)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Events that can carry the interaction a browser needs before it allows sound. A touch that ends a
// scroll fires some of these too but doesn't count, so the handler checks before unmuting.
const gestures = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation

// Phones and small tablets get the lighter 720p reel. Chosen once, so turning a tablet doesn't restart it.
const reelSrc = () => (window.matchMedia('(min-width: 1024px)').matches ? media.reelVideo : media.reelVideoSmall)

export function Reel() {
  const [src] = useState(reelSrc)
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.3 })
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const progress = useMotionValue(0)
  // Set when the visitor pauses, so scrolling back into view doesn't restart the reel.
  const userPaused = useRef(false)
  // Set when the visitor mutes, so the reel never turns its sound back on by itself.
  const userMuted = useRef(false)

  // Scroll progress as `--p` (0 = small window, 1 = open). The CSS turns it into the frame opening up
  // and the video settling from a slight zoom, with its own values for phones (see .reel in index.css).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  useMotionValueEvent(scrollYProgress, 'change', (v) => ref.current?.style.setProperty('--p', reduce ? '1' : v.toFixed(4)))
  useEffect(() => {
    ref.current?.style.setProperty('--p', reduce ? '1' : scrollYProgress.get().toFixed(4))
  }, [reduce, scrollYProgress])

  // Plays with sound while on screen. Browsers only allow sound once the visitor has tapped, clicked or
  // pressed a key on the page, so until then it plays muted and turns the sound on at that first
  // interaction (or simply starts then, on phones that refuse to autoplay at all).
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!inView) {
      video.pause()
      return
    }
    if (userPaused.current) return

    let cancelled = false
    const stop = () => gestures.forEach((g) => window.removeEventListener(g, onGesture))
    const onGesture = (e: Event) => {
      // The reel's own buttons handle their taps themselves.
      if (ref.current?.querySelector('.reel__bar')?.contains(e.target as Node)) return
      if (cancelled || userPaused.current) return stop()
      // Unmuting without a real tap/click/key makes the browser pause the reel, so wait for one.
      if (activation && !activation.isActive) return
      video.muted = userMuted.current
      setMuted(userMuted.current)
      video.play().then(stop, () => {
        // Still refused (a browser without the activation check, after a scroll): back to muted, keep waiting.
        video.muted = true
        setMuted(true)
        video.play().catch(() => {})
      })
    }

    const start = async () => {
      if (!userMuted.current) {
        video.muted = false
        try {
          await video.play()
          if (!cancelled) setMuted(false)
          return
        } catch {
          // Sound not allowed yet: fall back to muted below.
        }
      }
      if (cancelled) return
      // iOS also wants the `muted` attribute, not just the property, before it autoplays.
      video.defaultMuted = true
      video.muted = true
      setMuted(true)
      // Listen straight away rather than after play() settles: on a slow connection that can take a while.
      gestures.forEach((g) => window.addEventListener(g, onGesture, { passive: true }))
      video.play().catch(() => {})
    }
    start()

    return () => {
      cancelled = true
      stop()
    }
  }, [inView])

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
    userPaused.current = !video.paused
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  const toggleSound = () => {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    userMuted.current = next
    setMuted(next)
    if (!next && video.paused) {
      userPaused.current = false
      video.play().catch(() => {})
    }
  }

  return (
    <div ref={ref} className="reel">
      <div className="reel__glow" aria-hidden="true" />
      <div className="reel__frame">
        <video
          ref={videoRef}
          className="reel__video"
          src={src}
          poster={media.reelPoster}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label={intro.reelLabel}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
        <div className="reel__shade" aria-hidden="true" />

        <div className="reel__ui">
          <div className="reel__bar">
            <div className="reel__controls">
              <button
                type="button"
                className="reel__btn reel__btn--icon"
                onClick={togglePlay}
                aria-label={playing ? 'Pause reel' : 'Play reel'}
              >
                {playing ? <Pause size={18} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                className={`reel__btn${muted ? ' reel__btn--cta' : ''}`}
                onClick={toggleSound}
              >
                {muted ? <SoundOff size={18} /> : <SoundOn size={18} />}
                {muted ? 'Play with sound' : 'Mute'}
              </button>
            </div>
            <span className="reel__time">
              <span ref={clockRef}>00:00</span> / {time(duration)}
            </span>
          </div>
        </div>

        <div className="reel__progress" aria-hidden="true">
          <motion.span style={{ scaleX: progress }} />
        </div>
      </div>
    </div>
  )
}
