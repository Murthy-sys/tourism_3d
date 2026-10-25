// Native scrolling spends time according to the distance travelled, instead of
// giving a 200 m coach drive the same space as a short boarding transition.
export const SCROLL_TIMELINE=Object.freeze([
  [0,0],[.025,.75],[.045,1.5],[.105,8.5],[.14,9.2],
  [.28,13.2],[.42,14.4],[.60,19.4],[.74,20.6],[.90,25.6],[1,27.2],
].map(([progress,screens])=>Object.freeze({progress,screens})))
export const JOURNEY_TRAVEL_SCREENS=SCROLL_TIMELINE.at(-1).screens
export const JOURNEY_SCROLL_HEIGHT_VH=(JOURNEY_TRAVEL_SCREENS+1)*100
const clamp=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0))
const map=(value,from,to)=>{
  const index=Math.max(1,SCROLL_TIMELINE.findIndex(key=>key[from]>=value))
  const a=SCROLL_TIMELINE[index-1],b=SCROLL_TIMELINE[index]
  return a[to]+(b[to]-a[to])*(value-a[from])/(b[from]-a[from])
}
export const scrollToJourneyProgress=value=>map(clamp(value)*JOURNEY_TRAVEL_SCREENS,'screens','progress')
export const journeyProgressToScroll=value=>map(clamp(value),'progress','screens')/JOURNEY_TRAVEL_SCREENS

// Ease only the first/last tenth of a route. A steady scroll then produces a
// steady driving pace instead of the large mid-journey acceleration of smoothstep.
export const steadyTravelProgress=value=>{
  const t=clamp(value),ramp=.1,velocity=1/(1-ramp)
  const integral=u=>u**6-3*u**5+2.5*u**4
  if(t<ramp) return velocity*ramp*integral(t/ramp)
  if(t<=1-ramp) return velocity*(t-ramp/2)
  return 1-velocity*ramp*integral((1-t)/ramp)
}
