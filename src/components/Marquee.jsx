const words = ['Santorini', 'Kyoto', 'Serengeti', 'Reykjavik', 'Machu Picchu', 'Udaipur', 'Bali', 'Patagonia']

export default function Marquee() {
  const items = [...words, ...words]
  return (
    <div className="marquee">
      <div className="marquee__track">
        {items.map((w, i) => (
          <span key={i} className="marquee__item">
            {w} <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  )
}
