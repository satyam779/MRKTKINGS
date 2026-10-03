import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'
import { CallToAction } from './CallToAction'
import { Footer } from './Footer'
import { Nav } from './Nav'

// Shared page shell: nav, closing call-to-action and footer.
// Pass cta={false} when the page provides its own #contact section, or is the contact page itself.
export function Layout({ children, cta = true }: { children: ReactNode; cta?: boolean }) {
  return (
    // "user" turns off transform/layout animations for visitors who prefer reduced motion.
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        {children}
        {cta && <CallToAction />}
      </main>
      <Footer />
    </MotionConfig>
  )
}
