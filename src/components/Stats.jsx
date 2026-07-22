import { stats } from '../data'
import { useReveal, useCountUp } from '../hooks/useReveal'

function StatItem({ stat }) {
  const [ref, visible] = useReveal(0.5)
  const value = useCountUp(stat.value, visible)
  return (
    <div ref={ref} className="stat">
      <div className="stat__value">
        {value.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="stat__label">{stat.label}</div>
    </div>
  )
}

export default function Stats() {
  const [headRef, headVisible] = useReveal(0.4)
  return (
    <section id="about" className="section about">
      <div className="section__inner about__grid">
        <div ref={headRef} className={`about__copy reveal ${headVisible ? 'reveal--visible' : ''}`}>
          <p className="eyebrow">About WanderLux</p>
          <h2>Fourteen years of managing trips people actually remember.</h2>
          <p className="about__text">
            We started as a two-person travel desk booking weekend getaways. Today we manage
            end-to-end tourism logistics for individuals, families and companies across 96
            destinations — pairing on-the-ground local expertise with a support team that never
            goes quiet mid-trip.
          </p>
        </div>
        <div className="about__stats">
          {stats.map((s) => (
            <StatItem key={s.id} stat={s} />
          ))}
        </div>
      </div>
    </section>
  )
}
