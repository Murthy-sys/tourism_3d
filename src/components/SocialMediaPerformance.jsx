import {
  SOCIAL_MEDIA_METRICS,
  SOCIAL_MEDIA_PROFILE,
  SOCIAL_PERFORMANCE_START,
} from '../journey/chapters'

const clamp=value=>Math.min(1,Math.max(0,value))
const smootherstep=value=>{
  const t=clamp(value)
  return t*t*t*(t*(t*6-15)+10)
}

export const getSocialMetricWeight=(progress,index,reducedMotion=false)=>{
  if(reducedMotion) return 1
  const local=clamp(
    (progress-SOCIAL_PERFORMANCE_START)/(.91-SOCIAL_PERFORMANCE_START),
  )
  const start=index*.06
  return smootherstep((local-start)/(1-start))
}

export const formatSocialMetric=(metric,weight=1)=>{
  if(metric.value===null) return metric.display
  const value=metric.value*clamp(weight)
  if(metric.kind==='percent') return `${value.toFixed(1)}${metric.suffix}`
  return `${Math.floor(value/1000)}K${metric.suffix}`
}

export default function SocialMediaPerformance({
  progress,
  reducedMotion=false,
}){
  const entrance=reducedMotion
    ?1
    :smootherstep((progress-SOCIAL_PERFORMANCE_START)/.01)
  return <article
    className="chapter chapter--social-performance"
    aria-label="Social media performance"
    style={{'--performance-progress':entrance}}
  >
    <header className="social-performance__header">
      <div>
        <p className="chapter__kicker">Social Media Performance</p>
        <h1>Reach that moves people.</h1>
      </div>
      <a
        href={SOCIAL_MEDIA_PROFILE.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${SOCIAL_MEDIA_PROFILE.handle} on Instagram`}
      >
        {SOCIAL_MEDIA_PROFILE.handle} ↗
      </a>
    </header>
    <dl
      className="social-performance__metrics"
      aria-label="Instagram performance metrics"
    >
      {SOCIAL_MEDIA_METRICS.map((metric,index)=>{
        const weight=getSocialMetricWeight(
          progress,
          index,
          reducedMotion,
        )
        return <div
          className={`social-performance__metric social-performance__metric--${metric.kind}`}
          key={metric.id}
          style={{'--metric-progress':weight}}
        >
          <dt>{metric.label}</dt>
          <dd aria-label={`${metric.label}: ${metric.display}`}>
            <span aria-hidden="true">
              {formatSocialMetric(metric,weight)}
            </span>
          </dd>
        </div>
      })}
    </dl>
    <a
      className="social-performance__source"
      href={SOCIAL_MEDIA_PROFILE.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {SOCIAL_MEDIA_PROFILE.sourceLabel}
    </a>
  </article>
}
