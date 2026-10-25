import { journeyProgressToScroll,scrollToJourneyProgress } from '../src/journey/scrollTimeline.js'

// Runtime QA serializes semantic progress to six decimal places.
export const SNAPSHOT_PROGRESS_ROUNDING=.5e-6

export const captureProgressBounds=(progress,travel)=>{
  const scroll=journeyProgressToScroll(progress)
  return{
    min:scrollToJourneyProgress(scroll-1/travel)-SNAPSHOT_PROGRESS_ROUNDING,
    max:scrollToJourneyProgress(scroll+1/travel)+SNAPSHOT_PROGRESS_ROUNDING,
  }
}

const departureWeight=progress=>{
  const t=Math.min(1,Math.max(0,(progress-.14)/(.19-.14)))
  return t*t*t*(t*(t*6-15)+10)
}

export const departureWeightBounds=renderedProgress=>({
  min:departureWeight(renderedProgress-SNAPSHOT_PROGRESS_ROUNDING),
  expected:departureWeight(renderedProgress),
  max:departureWeight(renderedProgress+SNAPSHOT_PROGRESS_ROUNDING),
})
