import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Hero3D from './Hero3D'
import JourneyMenu from './JourneyMenu'
import BookingOverlay from './BookingOverlay'
import ChapterContent from './ChapterContent'
import { CHAPTERS, getChapterAtProgress, getProgressForChapter } from '../journey/chapters'

const smootherstep=value=>{
  const t=Math.min(1,Math.max(0,value))
  return t*t*t*(t*(t*6-15)+10)
}

export default function JourneyShell({onReady,introPhase='complete',onIntroComplete}){
  const track=useRef(null)
  const progressRef=useRef(0)
  const navigation=useRef({active:false,frame:null})
  const bookingTrigger=useRef(null)
  const sceneApiRef=useRef(null)
  const scrollFrame=useRef(0)
  const menuTrigger=useRef(null)
  const previousIntroPhase=useRef(introPhase)
  const [progress,setProgress]=useState(0)
  const [renderedFinaleProgress,setRenderedFinaleProgress]=useState(0)
  const [menuOpen,setMenuOpen]=useState(false)
  const [booking,setBooking]=useState(false)
  const [selectedPackage,setSelectedPackage]=useState(null)
  const [fallback,setFallback]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false)
  const introComplete=introPhase==='complete'
  const handleFallback=useCallback(()=>setFallback(true),[])
  const handleFinaleProgress=useCallback(value=>setRenderedFinaleProgress(value),[])
  const updateProgress=useCallback(value=>{
    progressRef.current=value
    sceneApiRef.current?.setProgress(value)
    setProgress(value)
  },[])
  useEffect(()=>{
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if(!preference) return
    const change=event=>setReducedMotion(event.matches)
    preference.addEventListener?.('change',change)
    return()=>preference.removeEventListener?.('change',change)
  },[])
  useLayoutEffect(()=>{
    if(introComplete) return
    const bodyOverflow=document.body.style.overflow
    const rootOverflow=document.documentElement.style.overflow
    const scrollRestoration=history.scrollRestoration
    document.body.style.overflow='hidden'
    document.documentElement.style.overflow='hidden'
    history.scrollRestoration='manual'
    scrollTo({top:0,left:0,behavior:'instant'})
    updateProgress(0)
    return()=>{
      document.body.style.overflow=bodyOverflow
      document.documentElement.style.overflow=rootOverflow
      history.scrollRestoration=scrollRestoration
    }
  },[introComplete,introPhase,updateProgress])
  useLayoutEffect(()=>{
    if(introComplete&&previousIntroPhase.current!=='complete'){
      scrollTo({top:0,left:0,behavior:'instant'})
      updateProgress(0)
      menuTrigger.current?.focus({preventScroll:true})
    }
    previousIntroPhase.current=introPhase
  },[introComplete,introPhase,updateProgress])
  useEffect(()=>{
    if(!introComplete) return
    // Feed the 3D scene straight from a rAF-coalesced layout read: at most one
    // getBoundingClientRect + one React update per frame, so mobile scroll stays
    // locked to the render loop instead of starving it (which had been dropping
    // the adaptive pixel ratio and pixelating the trekkers/boat/jeep).
    const measure=()=>{
      scrollFrame.current=0
      if(menuOpen||booking||navigation.current.active) return
      const element=track.current
      if(!element) return
      const travel=Math.max(1,element.offsetHeight-innerHeight)
      updateProgress(Math.min(1,Math.max(0,-element.getBoundingClientRect().top/travel)))
    }
    const onScroll=()=>{
      if(!scrollFrame.current) scrollFrame.current=requestAnimationFrame(measure)
    }
    measure()
    addEventListener('scroll',onScroll,{passive:true})
    return()=>{
      removeEventListener('scroll',onScroll)
      if(scrollFrame.current) cancelAnimationFrame(scrollFrame.current)
    }
  },[menuOpen,booking,introComplete,updateProgress])
  useEffect(()=>()=>cancelAnimationFrame(navigation.current.frame),[])
  useEffect(()=>{
    if(booking||!bookingTrigger.current)return
    const trigger=bookingTrigger.current
    bookingTrigger.current=null
    if(trigger.isConnected)trigger.focus()
  },[booking])
  const contentProgress=!fallback&&(progress>=.90||renderedFinaleProgress>=.90)
    ?renderedFinaleProgress
    :progress
  const chapter=getChapterAtProgress(contentProgress)
  const goTo=id=>{
    const selected=CHAPTERS.find(item=>item.id===id)
    const start=getProgressForChapter(id)
    const destination=selected?.navigationProgress??(selected?(start+selected.progressEnd)/2:start)
    const element=track.current
    if(!element) return
    const travel=element.offsetHeight-innerHeight
    const destinationTop=element.offsetTop+destination*travel
    const origin=progressRef.current
    const originTop=scrollY||0
    const duration=reducedMotion?280:900
    let startedAt
    cancelAnimationFrame(navigation.current.frame)
    navigation.current.active=true
    const advance=timestamp=>{
      if(startedAt===undefined) startedAt=timestamp
      const time=Math.min(1,(timestamp-startedAt)/duration)
      const blend=smootherstep(time)
      updateProgress(origin+(destination-origin)*blend)
      scrollTo({top:originTop+(destinationTop-originTop)*blend,behavior:'auto'})
      if(time<1){
        navigation.current.frame=requestAnimationFrame(advance)
      }else{
        navigation.current.active=false
      }
    }
    navigation.current.frame=requestAnimationFrame(advance)
  }
  const book=selected=>{
    bookingTrigger.current=document.activeElement instanceof HTMLButtonElement
      ?document.activeElement
      :null
    setSelectedPackage(selected)
    setBooking(true)
  }
  return <main className={`experience${introComplete?'':' experience--intro'}`} aria-hidden={!introComplete||undefined} inert={!introComplete?'':undefined}>
    <section className="experience__track" ref={track}>
      <div className="experience__stage">
        <div className="experience__sky"/>
        <Hero3D progress={progress} reducedMotion={reducedMotion} onFallback={handleFallback} onReady={onReady} sceneRef={sceneApiRef} introPhase={introPhase} onIntroComplete={onIntroComplete} onFinaleProgress={handleFinaleProgress}/>
        <div className="experience__grade"/>
        {introComplete&&<>
          <ChapterContent chapter={chapter} progress={contentProgress} reducedMotion={reducedMotion} onPlan={book}/>
          <div className="chapter-counter">{String(CHAPTERS.indexOf(chapter)+1).padStart(2,'0')} / {String(CHAPTERS.length).padStart(2,'0')}</div>
          <div className="scroll-signal">SCROLL TO TRAVEL<i/></div>
          {fallback&&<div className="journey-fallback" role="status">Cinematic fallback active.</div>}
        </>}
      </div>
    </section>
    {introComplete&&<>
      <div className="edge-controls"><JourneyMenu triggerRef={menuTrigger} open={menuOpen} onOpen={()=>setMenuOpen(true)} onClose={()=>setMenuOpen(false)} onSelect={goTo} onBook={()=>goTo('packages')}/></div>
      <BookingOverlay open={booking} selectedPackage={selectedPackage} onClose={()=>setBooking(false)}/>
    </>}
  </main>
}
