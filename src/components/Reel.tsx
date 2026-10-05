import { AnimatePresence, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { media } from '../content'
import { useAutoplay } from '../useAutoplay'
import { videoSrc } from '../videoSrc'
import { Play } from './Icons'
import { VideoLightbox } from './VideoLightbox'

// Showreel preview: a muted clip loops while on screen, and clicking it opens the reel full size.
// The reel never plays with sound.
export function Reel() {
  const [src] = useState(() => videoSrc(media.reelVideo, media.reelVideoSmall))
  // Where the preview was when the visitor pressed play; null while the full-size reel is closed.
  const [openAt, setOpenAt] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inView = useInView(ref, { amount: 0.3 })

  // The preview rests while the full-size reel is open.
  useAutoplay(videoRef, inView && openAt === null)

  return (
    <div ref={ref} className="reel">
      <button
        type="button"
        className="reel__media"
        onClick={() => setOpenAt(videoRef.current?.currentTime ?? 0)}
        aria-label="Watch the MRKTKings showreel"
      >
        <video
          ref={videoRef}
          src={src}
          poster={media.reelPoster}
          muted
          loop
          playsInline
          // Nothing loads until it starts playing on screen, so it doesn't compete with the hero.
          preload="none"
          aria-hidden="true"
        />
        <span className="reel__play" aria-hidden="true">
          <Play size={22} />
        </span>
      </button>

      {/* Outside the button: React passes clicks inside the lightbox up through its portal. */}
      <AnimatePresence>
        {openAt !== null && (
          <VideoLightbox
            src={src}
            poster={media.reelPoster}
            startAt={openAt}
            label="The MRKTKings showreel"
            onClose={() => setOpenAt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
