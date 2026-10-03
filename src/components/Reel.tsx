import { motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { intro, media } from '../content'
import { Pause, Play, SoundOff, SoundOn } from './Icons'

const time = (seconds: number) => {
  const s = Math.floor(seconds || 0)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Visitors who turned on Data Saver get the poster and press play themselves (the reel is ~24 MB).
const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

export function Reel() {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.3 })
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [duration, setDuration] = useState(0)
  const progress = useMotionValue(0)
  // Set when the visitor pauses, so scrolling back into view doesn't restart the reel.
  const userPaused = useRef(false)

  // Scroll progress as `--p` (0 = small window, 1 = open). The CSS turns it into the frame opening up
  // and the video settling from a slight zoom, with its own values for phones (see .reel in index.css).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  useMotionValueEvent(scrollYProgress, 'change', (v) => ref.current?.style.setProperty('--p', reduce ? '1' : v.toFixed(4)))
  useEffect(() => {
    ref.current?.style.setProperty('--p', reduce ? '1' : scrollYProgress.get().toFixed(4))
  }, [reduce, scrollYProgress])

  // Autoplay (muted) only while on screen, and never for reduced-motion or Data Saver visitors.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // React only sets `muted` as a property; iOS also wants the attribute before autoplaying.
    video.defaultMuted = true
    if (inView && !reduce && !saveData && !userPaused.current) video.play().catch(() => {})
    else if (!inView) video.pause()
  }, [inView, reduce])

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
    video.muted = !muted
    setMuted(!muted)
    if (muted && video.paused) {
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
          src={media.reelVideo}
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
          <span className="reel__label">
            <span className={`reel__dot${playing ? ' is-live' : ''}`} aria-hidden="true" />
            {intro.reelLabel}
          </span>

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
