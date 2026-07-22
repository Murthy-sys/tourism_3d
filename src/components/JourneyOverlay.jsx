export default function JourneyOverlay({stop,index,count}){
  return <div className="journey-overlay" key={stop.id}>
    <p className="journey-overlay__kicker">{String(index+1).padStart(2,'0')} — {stop.kicker}</p>
    <h1>{stop.name}</h1><p className="journey-overlay__description">{stop.description}</p>
    <a className="journey-overlay__action" href={stop.href} aria-label={`Explore ${stop.name}`}>Explore destination <span>↗</span></a>
    <div className="journey-progress" role="progressbar" aria-label="India journey progress" aria-valuemin="1" aria-valuemax={count} aria-valuenow={index+1}><i style={{width:`${((index+1)/count)*100}%`}} /></div>
    <p className="journey-overlay__count">{String(index+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</p>
  </div>
}
