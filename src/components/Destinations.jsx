import { destinations } from '../data'
import { useReveal } from '../hooks/useReveal'

function DestinationCard({ d, index }) {
  const [ref, visible] = useReveal(0.15)
  return (
    <div
      ref={ref}
      className={`destination-card reveal ${visible ? 'reveal--visible' : ''}`}
      id={`destination-${d.slug}`}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className="destination-card__media" style={{ background: d.gradient }}>
        <span className="destination-card__tag">{d.tag}</span>
      </div>
      <div className="destination-card__body">
        <h3>{d.name}</h3>
        <p>{d.country}</p>
      </div>
    </div>
  )
}

export default function Destinations() {
  const [headRef, headVisible] = useReveal(0.4)
  return (
    <section id="destinations" className="section destinations">
      <div className="section__inner">
        <div ref={headRef} className={`section__head reveal ${headVisible ? 'reveal--visible' : ''}`}>
          <p className="eyebrow">Where to next</p>
          <h2>Featured destinations, curated by our travel desk.</h2>
        </div>
        <div className="destinations__grid">
          {destinations.map((d, i) => (
            <DestinationCard key={d.id} d={d} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
