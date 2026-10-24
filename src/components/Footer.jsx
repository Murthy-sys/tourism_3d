import { DEMO_CONTACT } from '../data'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          XYZ <span>Travellers</span>
          <p>Tourism &amp; travel management, done beautifully.</p>
        </div>

        <div className="footer__col">
          <h4>Company</h4>
          <a href="#services">Services</a>
          <a href="#destinations">Destinations</a>
          <a href="#about">About</a>
        </div>

        <div className="footer__col">
          <h4>Contact</h4>
          <span>{DEMO_CONTACT.email}</span>
          <span>{DEMO_CONTACT.phone}</span>
          <span>{DEMO_CONTACT.address}</span>
          <span>Demo contact details</span>
        </div>

        <div className="footer__col">
          <h4>Follow</h4>
          <span>Instagram · Demo profile</span>
          <span>Pinterest · Demo profile</span>
          <span>LinkedIn · Demo profile</span>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© {year} XYZ Travellers. All rights reserved.</span>
      </div>
    </footer>
  )
}
