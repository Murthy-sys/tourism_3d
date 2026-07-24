import {
  BRAND_CAPABILITIES,
  SOCIAL_PERFORMANCE_START,
  TRAVEL_PLANS,
} from '../journey/chapters'
import { getJourneyState } from '../three/journeyData'
import SocialMediaPerformance from './SocialMediaPerformance'

export default function ChapterContent({
  chapter,
  progress,
  reducedMotion=false,
  onPlan,
  onBook,
}){
  const planFocus=getJourneyState(progress).planFocus
  if(chapter.layout==='drive')return null
  if(
    chapter.layout==='monument-plans'&&
    progress>=SOCIAL_PERFORMANCE_START
  )return <SocialMediaPerformance
    progress={progress}
    reducedMotion={reducedMotion}
  />
  const isOperations=chapter.layout==='operations'
  const brandValueBeat=isOperations&&progress>=.25
  const creatorBeat=isOperations&&progress>=.22&&!brandValueBeat
  if(brandValueBeat)return <article
    className="chapter chapter--operations chapter--brand-value"
    key={`${chapter.id}-brand-value`}
    aria-label="Brand collaboration value"
  >
    <section
      className="brand-value-card brand-value-card--offer"
      aria-labelledby={`chapter-${chapter.id}-offer`}
    >
      <h1 id={`chapter-${chapter.id}-offer`}>
        {chapter.brandValue.offer.title}
      </h1>
      <ul aria-label="What we offer">
        {chapter.brandValue.offer.items.map(item=><li key={item}>{item}</li>)}
      </ul>
    </section>
    <section
      className="brand-value-card brand-value-card--reasons"
      aria-labelledby={`chapter-${chapter.id}-reasons`}
    >
      <h2 id={`chapter-${chapter.id}-reasons`}>
        {chapter.brandValue.reasons.title}
      </h2>
      <ul aria-label="Why brands should work with us">
        {chapter.brandValue.reasons.items.map(item=><li key={item}>{item}</li>)}
      </ul>
    </section>
  </article>
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
