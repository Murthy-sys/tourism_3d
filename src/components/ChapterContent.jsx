import {
  BRAND_CAPABILITIES,
  BOAT_OFFER_END,
  BOAT_OFFER_START,
  SOCIAL_PERFORMANCE_START,
  TREK_PACKAGES,
} from '../journey/chapters'
import SocialMediaPerformance from './SocialMediaPerformance'
import ContactCard from './ContactCard'

export const getMobileCardPlacement=(layout,progress)=>{
  if(layout==='operations') return 'top'
  if(layout==='monument-plans'){
    if(progress>=SOCIAL_PERFORMANCE_START) return 'bottom'
    if(progress>=BOAT_OFFER_START&&progress<BOAT_OFFER_END) return 'top'
  }
  return null
}

export default function ChapterContent({
  chapter,
  progress,
  reducedMotion=false,
  onPlan,
}){
  if(chapter.layout==='drive')return null
  const mobilePlacement=getMobileCardPlacement(chapter.layout,progress)
  const mobilePlacementClass=mobilePlacement
    ?`chapter--mobile-safe-${mobilePlacement}`
    :''
  if(chapter.layout==='contact-card') return <ContactCard/>
  if(chapter.layout==='operations'){
    return <article
      className={`chapter chapter--operations chapter--glass-card ${mobilePlacementClass}`}
      aria-labelledby={`chapter-${chapter.id}`}
    >
      <p className="chapter__kicker">{chapter.kicker}</p>
      <h1 id={`chapter-${chapter.id}`}>{chapter.title}</h1>
      <p className="chapter__body">{chapter.body}</p>
    </article>
  }
  if(chapter.layout==='monument-plans'){
    if(progress>=SOCIAL_PERFORMANCE_START){
      return <SocialMediaPerformance
        progress={progress}
        reducedMotion={reducedMotion}
        className={mobilePlacementClass}
      />
    }
    if(progress>=BOAT_OFFER_START&&progress<BOAT_OFFER_END){
      return <article
        className={`chapter chapter--operations chapter--creator-card chapter--glass-card chapter--boat-offer ${mobilePlacementClass}`}
        aria-labelledby="boat-offer-title"
      >
        <p className="chapter__kicker">Brand collaborations</p>
        <h1 id="boat-offer-title">What We Offer</h1>
        <p className="chapter__body">
          End-to-end travel storytelling shaped for destinations and brands.
        </p>
        <div className="operations-proof" aria-label="What we offer">
          {BRAND_CAPABILITIES.map(capability=>
            <span key={capability}>{capability}</span>,
          )}
        </div>
      </article>
    }
    return null
  }
  const content=chapter
  const className=[
    'chapter',
    `chapter--${chapter.layout}`,
    mobilePlacementClass,
  ].filter(Boolean).join(' ')
  return <article className={className} key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
    <p className="chapter__kicker">{content.kicker}</p><h1 id={`chapter-${chapter.id}`}>{content.title}</h1><p className="chapter__body">{content.body}</p>
    {chapter.layout==='pavilion-contact'&&
      <div className="package-card-rail" aria-label="Available trek packages">
        {TREK_PACKAGES.map(pkg=>
          <article className="package-card" key={pkg.id}>
            <p className="package-card__duration">{pkg.duration}</p>
            <h2>{pkg.name}</h2>
            <strong className="package-card__price">
              {pkg.priceLabel}<small> / day</small>
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
