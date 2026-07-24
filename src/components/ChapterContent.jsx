import {BRAND_CAPABILITIES,TRAVEL_PLANS} from '../journey/chapters'
import { getJourneyState } from '../three/journeyData'

export default function ChapterContent({chapter,progress,onPlan,onBook}){
  const planFocus=getJourneyState(progress).planFocus
  if(chapter.layout==='drive')return null
  const creatorBeat=chapter.layout==='operations'&&progress>=.22
  const content=creatorBeat?chapter.creator:chapter
  const className=[
    'chapter',
    `chapter--${chapter.layout}`,
    creatorBeat?'chapter--creator-card':'',
  ].filter(Boolean).join(' ')
  return <article className={className} key={`${chapter.id}-${creatorBeat?'creator':'overview'}`} aria-labelledby={`chapter-${chapter.id}`}>
    <p className="chapter__kicker">{content.kicker}</p><h1 id={`chapter-${chapter.id}`}>{content.title}</h1><p className="chapter__body">{content.body}</p>
    {chapter.layout==='operations'&&!creatorBeat&&<div className="operations-proof" aria-label="What we do">{BRAND_CAPABILITIES.map(capability=><span key={capability}>{capability}</span>)}</div>}
    {creatorBeat&&<div className="creator-pillars" aria-label="Creator coverage">{content.pillars.map(pillar=><span key={pillar}>{pillar}</span>)}</div>}
    {chapter.layout==='monument-plans'&&<div className="monument-plan-actions">{TRAVEL_PLANS.map((p,i)=><button className={planFocus===i?'active':''} aria-label={`Plan ${p.name} journey`} key={p.id} onClick={()=>onPlan(p)}><span>0{i+1} · {p.style}</span><strong>{p.name}</strong><small>{p.days} · {p.route}</small><b>Plan this journey ↗</b></button>)}</div>}
    {chapter.layout==='pavilion-contact'&&<div className="contact-finale"><button onClick={onBook}>Plan your India journey</button><a href="mailto:journeys@wanderlux.in">journeys@wanderlux.in</a><p>India specialists · Available worldwide · Support throughout your journey</p></div>}
  </article>
}
