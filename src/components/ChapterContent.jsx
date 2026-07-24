import {
  BRAND_CAPABILITIES,
  SOCIAL_PERFORMANCE_START,
  TREK_PACKAGES,
} from '../journey/chapters'
import SocialMediaPerformance from './SocialMediaPerformance'

export default function ChapterContent({
  chapter,
  progress,
  reducedMotion=false,
  onPlan,
}){
  if(chapter.layout==='drive')return null
  if(chapter.layout==='monument-plans'){
    if(progress>=SOCIAL_PERFORMANCE_START){
      return <SocialMediaPerformance
        progress={progress}
        reducedMotion={reducedMotion}
      />
    }
    return null
  }
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
    {chapter.layout==='pavilion-contact'&&
      <div className="package-card-rail" aria-label="Available trek packages">
        {TREK_PACKAGES.map(pkg=>
          <article className="package-card" key={pkg.id}>
            <p className="package-card__duration">{pkg.duration}</p>
            <h2>{pkg.name}</h2>
            <strong className="package-card__price">
              {pkg.priceLabel}<small> per person</small>
            </strong>
            <p className="package-card__transfer">{pkg.transfer}</p>
            <ul>
              {pkg.inclusions.map(item=><li key={item}>{item}</li>)}
            </ul>
            <button
              type="button"
              aria-label={`Select ${pkg.name} package`}
              onClick={()=>onPlan(pkg)}
            >
              Select dates <span aria-hidden="true">↗</span>
            </button>
          </article>,
        )}
      </div>
    }
  </article>
}
