import { useEffect, useMemo, useRef, useState } from 'react'
import Hero3D from './Hero3D'
import JourneyOverlay from './JourneyOverlay'
import { JOURNEY_STOPS, getJourneyState } from '../three/journeyData'

export default function Hero(){
  const ref=useRef(null),[progress,setProgress]=useState(0),[fallback,setFallback]=useState(false)
  const reducedMotion=useMemo(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,[])
  useEffect(()=>{const update=()=>{const el=ref.current;if(!el)return;const travel=Math.max(1,el.offsetHeight-window.innerHeight);setProgress(Math.min(1,Math.max(0,-el.getBoundingClientRect().top/travel)))};update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[])
  const state=getJourneyState(progress)
  return <section id="top" className={`journey ${fallback?'journey--fallback':''}`} ref={ref}>
    <div className="journey__stage"><div className="journey__sky"/><Hero3D progress={progress} reducedMotion={reducedMotion} onFallback={()=>setFallback(true)}/><div className="journey__vignette"/>
      <JourneyOverlay stop={state.activeStop} index={state.activeIndex} count={JOURNEY_STOPS.length}/>
      <a href="#booking" className="journey__book">Plan my India trip</a><div className="journey__scroll">Scroll to travel <i/></div>
      {fallback&&<div className="journey-fallback" role="status">Showing the cinematic travel preview.</div>}
    </div>
  </section>
}
