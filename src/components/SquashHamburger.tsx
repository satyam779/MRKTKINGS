import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 300, damping: 20 } as const
const centred = { y: '-50%' }

// Three bars that fold into an X: top and bottom rotate to the centre, the middle one squashes away.
export function SquashHamburger({ open }: { open: boolean }) {
  return (
    <span className="squash" aria-hidden="true">
      <motion.span
        className="squash__bar"
        style={centred}
        animate={open ? { top: '50%', rotate: 45 } : { top: '0%', rotate: 0 }}
        transition={spring}
      />
      <motion.span
        className="squash__bar"
        style={{ ...centred, top: '50%' }}
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={spring}
      />
      <motion.span
        className="squash__bar"
        style={centred}
        animate={open ? { top: '50%', rotate: -45 } : { top: '100%', rotate: 0 }}
        transition={spring}
      />
    </span>
  )
}
