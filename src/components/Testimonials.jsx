import { useState } from 'react'
import { testimonials } from '../data'
import { useReveal } from '../hooks/useReveal'

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const [ref, visible] = useReveal(0.3)
  const t = testimonials[active]

  return (
    <section id="testimonials" className="section testimonials">
      <div className="section__inner">
        <div ref={ref} className={`reveal ${visible ? 'reveal--visible' : ''}`}>
          <p className="eyebrow">Traveler stories</p>
          <blockquote className="testimonial">
            <p>&ldquo;{t.quote}&rdquo;</p>
            <footer>
              <span className="testimonial__name">{t.name}</span>
              <span className="testimonial__trip">{t.trip}</span>
            </footer>
          </blockquote>
          <div className="testimonial__dots">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                className={`testimonial__dot ${i === active ? 'testimonial__dot--active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
