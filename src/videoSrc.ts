// Phones and small tablets get the lighter copy of a video. Call it once (e.g. in a useState initialiser), so
// turning a tablet doesn't restart the video.
export const videoSrc = (large: string, small: string) =>
  window.matchMedia('(min-width: 1024px)').matches ? large : small
