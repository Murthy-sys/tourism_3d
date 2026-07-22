import { useState } from 'react'
import { useReveal } from '../hooks/useReveal'

const initialForm = { name: '', email: '', destination: '', dates: '', travelers: '1', message: '' }

export default function Booking() {
  const [ref, visible] = useReveal(0.2)
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="booking" className="section booking">
      <div className="section__inner booking__grid">
        <div ref={ref} className={`booking__intro reveal ${visible ? 'reveal--visible' : ''}`}>
          <p className="eyebrow">Start planning</p>
          <h2>Tell us about the trip you’re imagining.</h2>
          <p className="about__text">
            Share a few details and a travel manager will get back to you within one business
            day with a first-draft itinerary and pricing.
          </p>
          <ul className="booking__list">
            <li>Free consultation, no obligation</li>
            <li>Response within 24 hours</li>
            <li>Custom itinerary, not a template</li>
          </ul>
        </div>

        <form className="booking__form" onSubmit={handleSubmit}>
          {submitted ? (
            <div className="booking__success">
              <h3>Request received.</h3>
              <p>Thanks{form.name ? `, ${form.name}` : ''} — a travel manager will reach out shortly.</p>
              <button type="button" className="btn btn--ghost" onClick={() => { setForm(initialForm); setSubmitted(false) }}>
                Submit another
              </button>
            </div>
          ) : (
            <>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" name="email" value={form.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="destination">Destination</label>
                  <input id="destination" name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. Kerala or Rajasthan" required />
                </div>
                <div className="field">
                  <label htmlFor="dates">Travel dates</label>
                  <input id="dates" name="dates" value={form.dates} onChange={handleChange} placeholder="e.g. Sept 10–20" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="travelers">Travelers</label>
                <select id="travelers" name="travelers" value={form.travelers} onChange={handleChange}>
                  {[1, 2, 3, 4, 5, '6+'].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="message">Anything else we should know?</label>
                <textarea id="message" name="message" rows="3" value={form.message} onChange={handleChange} />
              </div>
              <button type="submit" className="btn btn--primary btn--full">Request Itinerary</button>
            </>
          )}
        </form>
      </div>
    </section>
  )
}
