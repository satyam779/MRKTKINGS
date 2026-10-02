import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useEffect, useState } from 'react'
import { contact, links, media } from '../content'
import { ArrowUpRight } from './Icons'
import { SquashHamburger } from './SquashHamburger'

const pages = [
  { label: 'Services', href: links.services },
  { label: 'Projects', href: links.work },
  { label: 'About', href: links.about },
]

const path = typeof window !== 'undefined' ? window.location.pathname : '/'
const isCurrent = (href: string) => (path.startsWith(href) ? 'page' : undefined)

export function Nav() {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)

  // Solid background once the page moves; hide while scrolling down, show on the way up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 40)
    setHidden(y > 400 && y > prev && !open)
  })

  // Phone menu: lock page scroll and close on Escape.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <motion.header
        className={`nav ${solid || open ? 'nav--solid' : ''}`}
        animate={{ y: hidden ? '-100%' : '0%' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container nav__inner">
          <a href="/" className="nav__logo" aria-label="MRKTKings home">
            <img src={media.logo.src} width={media.logo.width} height={media.logo.height} alt="MRKTKings" />
          </a>

          <nav className="nav__actions" aria-label="Main">
            {pages.map((page) => (
              <a key={page.href} href={page.href} className="nav__link" aria-current={isCurrent(page.href)}>
                {page.label}
              </a>
            ))}
            <a href="#contact" className="btn btn--primary nav__btn" aria-label="Let's Connect" onClick={() => setOpen(false)}>
              <span className="nav__btn-label">Let&rsquo;s Connect</span> <ArrowUpRight size={16} />
            </a>
            <button
              type="button"
              className="nav__toggle"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <SquashHamburger open={open} />
            </button>
          </nav>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul>
              {[{ label: 'Home', href: '/' }, ...pages].map((page, i) => (
                <motion.li
                  key={page.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
                >
                  <a href={page.href} aria-current={page.href === '/' ? (path === '/' ? 'page' : undefined) : isCurrent(page.href)}>
                    {page.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="menu__footer">
              <a href={links.email}>{contact.email}</a>
              <a href={links.whatsapp}>{contact.phone}</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
