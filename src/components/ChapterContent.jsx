import { TRAVEL_PLANS } from '../journey/chapters'
import { getJourneyState } from '../three/journeyData'

export default function ChapterContent({chapter,progress,onPlan,onBook}){
  const planFocus=getJourneyState(progress).planFocus
  if(chapter.layout==='drive')return null
  return <article className={`chapter chapter--${chapter.layout}`} key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
    <p className="chapter__kicker">{chapter.kicker}</p><h1 id={`chapter-${chapter.id}`}>{chapter.title}</h1><p className="chapter__body">{chapter.body}</p>
    {chapter.layout==='operations'&&<div className="operations-proof" aria-label="What we do"><span>Destination specialists</span><span>Stays & transport</span><span>Verified local partners</span><span>Documents & permits</span><span>24/7 journey support</span><span>Private, group & corporate</span></div>}
    {chapter.layout==='monument-plans'&&<div className="monument-plan-actions">{TRAVEL_PLANS.map((p,i)=><button className={planFocus===i?'active':''} aria-label={`Plan ${p.name} journey`} key={p.id} onClick={()=>onPlan(p)}><span>0{i+1} · {p.style}</span><strong>{p.name}</strong><small>{p.days} · {p.route}</small><b>Plan this journey ↗</b></button>)}</div>}
    {chapter.layout==='pavilion-contact'&&<div className="contact-finale"><button onClick={onBook}>Plan your India journey</button><a href="mailto:journeys@wanderlux.in">journeys@wanderlux.in</a><p>India specialists · Available worldwide · Support throughout your journey</p></div>}
  </article>
}
