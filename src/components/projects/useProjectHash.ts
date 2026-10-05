import { useCallback, useEffect, useRef, useState } from 'react'

// Keeps the open project in the URL hash (/our-work/#sereneve) so it can be linked to,
// and so the browser Back button closes the popup.
export function useProjectHash(slugs: string[]) {
  const read = useCallback(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    return slugs.includes(hash) ? hash : null
  }, [slugs])

  const [slug, setSlug] = useState<string | null>(read)
  // true when the popup should grow out of its card (opened from the grid), false when paging inside it
  const [morph, setMorph] = useState(true)
  const pushed = useRef(false)

  useEffect(() => {
    const sync = () => {
      setMorph(true)
      setSlug(read())
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [read])

  // Cards are plain #hash links; this just records that the history entry is ours to pop.
  const markOpened = useCallback(() => {
    pushed.current = true
  }, [])

  const close = useCallback(() => {
    setMorph(true)
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setSlug(null)
    }
  }, [])

  const go = useCallback((next: string) => {
    setMorph(false)
    window.history.replaceState(null, '', `#${next}`)
    setSlug(next)
  }, [])

  return { slug, morph, markOpened, close, go }
}
