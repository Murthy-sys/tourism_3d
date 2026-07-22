export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          Wander<span>Lux</span>
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
          <a href="mailto:hello@wanderlux.travel">hello@wanderlux.travel</a>
          <a href="tel:+18005551234">+1 (800) 555-1234</a>
          <span>128 Harbor Ave, Suite 400</span>
        </div>

        <div className="footer__col">
          <h4>Follow</h4>
          <a href="#top">Instagram</a>
          <a href="#top">Pinterest</a>
          <a href="#top">LinkedIn</a>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© {year} WanderLux Journeys. All rights reserved.</span>
      </div>
    </footer>
  )
}
