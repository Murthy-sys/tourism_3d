import { useEffect, useState } from 'react'
import SoundToggle from './SoundToggle'

const links = [
  { href: '#services', label: 'Services' },
  { href: '#destinations', label: 'Destinations' },
  { href: '#about', label: 'About' },
  { href: '#testimonials', label: 'Stories' },
  { href: '#booking', label: 'Book a Trip' },
]

export default function Navbar({ soundOn = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = (e, href) => {
    e.preventDefault()
    setOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href="#top" className="navbar__logo" onClick={(e) => handleClick(e, '#top')}>
          Wander<span>Lux</span>
        </a>

        <nav className={`navbar__links ${open ? 'navbar__links--open' : ''}`}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => handleClick(e, l.href)}>
              {l.label}
            </a>
          ))}
        </nav>

        <a href="#booking" className="navbar__cta" onClick={(e) => handleClick(e, '#booking')}>
          Plan My Trip
        </a>

        <SoundToggle initialOn={soundOn} />

        <button
          className={`navbar__burger ${open ? 'navbar__burger--open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
