import { useRef } from 'react'
import { services } from '../data'
import { useReveal } from '../hooks/useReveal'
import Icon from './Icon'

function ServiceCard({ service, index }) {
  const cardRef = useRef(null)
  const [ref, visible] = useReveal(0.15)

  const handleMove = (e) => {
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rotateX = ((y / rect.height) - 0.5) * -10
    const rotateY = ((x / rect.width) - 0.5) * 10
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px)`
  }

  const handleLeave = () => {
    cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)'
  }

  return (
    <div
      ref={(node) => { ref.current = node; cardRef.current = node }}
      className={`tilt-card service-card reveal ${visible ? 'reveal--visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <span className="service-card__index">{service.id}</span>
      <div className="service-card__icon"><Icon name={service.icon} /></div>
      <h3>{service.title}</h3>
      <p>{service.text}</p>
    </div>
  )
}

export default function Services() {
  const [headRef, headVisible] = useReveal(0.4)
  return (
    <section id="services" className="section services">
      <div className="section__inner">
        <div ref={headRef} className={`section__head reveal ${headVisible ? 'reveal--visible' : ''}`}>
          <p className="eyebrow">What we manage</p>
          <h2>Everything a trip needs, handled in one place.</h2>
        </div>
        <div className="services__grid">
          {services.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
