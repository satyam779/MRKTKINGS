import { contact, links } from '../content'
import { Instagram, LinkedIn, WhatsApp } from './Icons'
import { Reveal } from './Reveal'

const socials = [
  { label: 'WhatsApp', href: links.whatsapp, Icon: WhatsApp },
  { label: 'LinkedIn', href: links.linkedin, Icon: LinkedIn },
  { label: 'Instagram', href: links.instagram, Icon: Instagram },
]

const quickLinks = [
  { label: 'Services', href: links.services },
  { label: 'Projects', href: links.work },
  { label: 'Contact', href: links.contact },
  { label: 'Careers', href: links.careers },
]

const year = new Date().getFullYear()
// Lets the long address wrap after the @ on small screens instead of mid-word.
const [before, after] = contact.email.split('@')

const otherLinks = [
  { label: 'Privacy Policy', href: links.privacy },
  { label: 'Disclaimer', href: links.disclaimer },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Reveal>
          <span className="eyebrow">Your growth journey starts here</span>
          <div style={{ marginTop: 20 }}>
            <a href={links.email} className="footer__mail">
              {before}@<wbr />
              {after}
            </a>
          </div>
        </Reveal>

        <ul className="socials">
          {socials.map(({ label, href, Icon }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Icon size={18} /> {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="footer__grid">
          <div>
            <h3>Contact info</h3>
            <address>
              {contact.address.map((line) => (
                <span key={line} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
              <a href={links.whatsapp} style={{ display: 'inline-block', marginTop: 12 }}>
                {contact.phone}
              </a>
            </address>
          </div>
          <nav aria-label="Quick links">
            <h3>Quick links</h3>
            <ul>
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Other links">
            <h3>Other links</h3>
            <ul>
              {otherLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="footer__wordmark" aria-hidden="true">
          MRKTKINGS
        </p>

        <div className="footer__bottom">
          <span>© {year} MRKTKings. All rights reserved.</span>
          <span>Crowning brands with success.</span>
        </div>
      </div>
    </footer>
  )
}
