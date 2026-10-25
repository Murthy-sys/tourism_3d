import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Hero3D from './Hero3D'
import JourneyMenu from './JourneyMenu'
import BookingOverlay from './BookingOverlay'
import ChapterContent from './ChapterContent'
import { CHAPTERS, getChapterAtProgress, getProgressForChapter } from '../journey/chapters'
import { scrollToJourneyProgress,journeyProgressToScroll,JOURNEY_SCROLL_HEIGHT_VH } from '../journey/scrollTimeline'

const MemoizedChapterContent=memo(ChapterContent)

const smootherstep=value=>{
  const t=Math.min(1,Math.max(0,value))
  return t*t*t*(t*(t*6-15)+10)
}

export default function JourneyShell({onReady,onLoadingState,loadAttempt=0,introPhase='complete',onIntroComplete}){
  const track=useRef(null)
  const progressRef=useRef(0)
  const navigation=useRef({active:false,frame:null,generation:0})
  const bookingTrigger=useRef(null)
  const sceneApiRef=useRef(null)
  const scrollFrame=useRef(0)
  const inputIntent=useRef({manualAt:-Infinity,keyboard:false})
  const menuTrigger=useRef(null)
  const previousIntroPhase=useRef(introPhase)
  const [progress,setProgress]=useState(0)
  const [renderedFinaleProgress,setRenderedFinaleProgress]=useState(0)
  const [renderedProgress,setRenderedProgress]=useState(null)
  const [menuOpen,setMenuOpen]=useState(false)
  const [booking,setBooking]=useState(false)
  const [selectedPackage,setSelectedPackage]=useState(null)
  const [fallback,setFallback]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false)
  const introComplete=introPhase==='complete'
  const handleFallback=useCallback(()=>setFallback(true),[])
  const handleFinaleProgress=useCallback(value=>setRenderedFinaleProgress(value),[])
  const handleRenderedProgress=useCallback(value=>setRenderedProgress(value),[])
  const updateProgress=useCallback((value,options)=>{
    progressRef.current=value
    sceneApiRef.current?.setProgress(value,options)
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
    // Read native scroll once per frame. It is also the single source of truth
    // for a chapter seek, so interrupting one never jumps to a second timeline.
    const measure=()=>{
      scrollFrame.current=0
      if(menuOpen||booking||navigation.current.active) return
      const element=track.current
      if(!element) return
      const travel=Math.max(1,element.offsetHeight-innerHeight)
      const value=scrollToJourneyProgress(-element.getBoundingClientRect().top/travel)
      const abruptJump=Math.abs(journeyProgressToScroll(value)-journeyProgressToScroll(progressRef.current))>.025
      const directJump=abruptJump&&performance.now()-inputIntent.current.manualAt>300
      updateProgress(value,{navigation:inputIntent.current.keyboard||directJump})
      inputIntent.current.keyboard=false
    }
    const onScroll=()=>{
      if(!scrollFrame.current) scrollFrame.current=requestAnimationFrame(measure)
    }
    const interruptNavigation=()=>{
      if(!navigation.current.active) return
      navigation.current.active=false
      navigation.current.generation++
      cancelAnimationFrame(navigation.current.frame)
      navigation.current.frame=null
      onScroll()
    }
    const onManualInput=()=>{
      inputIntent.current.manualAt=performance.now()
      inputIntent.current.keyboard=false
      interruptNavigation()
    }
    const onKeyDown=event=>{
      if(event.defaultPrevented||event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return
      if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)){
        inputIntent.current.keyboard=['PageUp','PageDown','Home','End',' '].includes(event.key)
        interruptNavigation()
      }
    }
    measure()
    addEventListener('scroll',onScroll,{passive:true})
    addEventListener('wheel',onManualInput,{passive:true})
    addEventListener('touchstart',onManualInput,{passive:true})
    addEventListener('touchmove',onManualInput,{passive:true})
    addEventListener('keydown',onKeyDown)
    return()=>{
      removeEventListener('scroll',onScroll)
      removeEventListener('wheel',onManualInput)
      removeEventListener('touchstart',onManualInput)
      removeEventListener('touchmove',onManualInput)
      removeEventListener('keydown',onKeyDown)
      if(scrollFrame.current) cancelAnimationFrame(scrollFrame.current)
      scrollFrame.current=0
    }
  },[menuOpen,booking,introComplete,updateProgress])
  useEffect(()=>()=>cancelAnimationFrame(navigation.current.frame),[])
  useEffect(()=>{
    if(booking||!bookingTrigger.current)return
    const trigger=bookingTrigger.current
    bookingTrigger.current=null
    if(trigger.isConnected)trigger.focus()
  },[booking])
  const visualProgress=fallback?progress:renderedProgress??progress
  const contentProgress=fallback?progress
    :renderedFinaleProgress>=.90?renderedFinaleProgress
    :visualProgress>=.90?Math.min(visualProgress,.955)
    :visualProgress
  const chapter=getChapterAtProgress(contentProgress)
  const goTo=id=>{
    const selected=CHAPTERS.find(item=>item.id===id)
    const start=getProgressForChapter(id)
    const destination=selected?.navigationProgress??(selected?(start+selected.progressEnd)/2:start)
    const element=track.current
    if(!element) return
    const travel=Math.max(1,element.offsetHeight-innerHeight)
    const destinationTop=element.offsetTop+journeyProgressToScroll(destination)*travel
    const originTop=scrollY||0
    const duration=reducedMotion?280:900
    let startedAt
    cancelAnimationFrame(navigation.current.frame)
    navigation.current.active=true
    const generation=++navigation.current.generation
    const advance=timestamp=>{
      if(!navigation.current.active||navigation.current.generation!==generation) return
      if(startedAt===undefined) startedAt=timestamp
      const time=Math.min(1,(timestamp-startedAt)/duration)
      const blend=smootherstep(time)
      const top=originTop+(destinationTop-originTop)*blend
      // The existing scene controller owns easing. Never restart the browser's
      // CSS smooth-scroll animation underneath this deliberate menu tween.
      scrollTo({top,behavior:'instant'})
      updateProgress(scrollToJourneyProgress((top-element.offsetTop)/travel),{navigation:true})
      if(time<1){
        navigation.current.frame=requestAnimationFrame(advance)
      }else{
        navigation.current.active=false
        navigation.current.frame=null
      }
    }
    navigation.current.frame=requestAnimationFrame(advance)
  }
  const book=useCallback(selected=>{
    bookingTrigger.current=document.activeElement instanceof HTMLButtonElement
      ?document.activeElement
      :null
    setSelectedPackage(selected)
    setBooking(true)
  },[])
  return <main className={`experience${introComplete?'':' experience--intro'}`} aria-hidden={!introComplete||undefined} inert={!introComplete?'':undefined}>
    <section className="experience__track" ref={track} style={{'--journey-scroll-height':`${JOURNEY_SCROLL_HEIGHT_VH}vh`}}>
      <div className="experience__stage">
        <div className="experience__sky"/>
        <Hero3D progress={progress} reducedMotion={reducedMotion} onFallback={handleFallback} onReady={onReady} onLoadingState={onLoadingState} loadAttempt={loadAttempt} sceneRef={sceneApiRef} introPhase={introPhase} onIntroComplete={onIntroComplete} onFinaleProgress={handleFinaleProgress} onProgress={handleRenderedProgress}/>
        <div className="experience__grade"/>
        {introComplete&&<>
          <MemoizedChapterContent chapter={chapter} progress={contentProgress} reducedMotion={reducedMotion} onPlan={book}/>
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
