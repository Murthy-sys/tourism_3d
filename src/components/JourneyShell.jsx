import { useEffect, useMemo, useRef, useState } from 'react'
import Hero3D from './Hero3D'
import JourneyMenu from './JourneyMenu'
import BookingOverlay from './BookingOverlay'
import ChapterContent from './ChapterContent'
import { CHAPTERS, getChapterAtProgress, getProgressForChapter } from '../journey/chapters'

export default function JourneyShell(){
  const track=useRef(null),[progress,setProgress]=useState(0),[menuOpen,setMenuOpen]=useState(false),[booking,setBooking]=useState(false),[plan,setPlan]=useState(''),[fallback,setFallback]=useState(false)
  const reducedMotion=useMemo(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,[])
  useEffect(()=>{const update=()=>{if(menuOpen||booking)return;const el=track.current;if(!el)return;const travel=Math.max(1,el.offsetHeight-innerHeight);setProgress(Math.min(1,Math.max(0,-el.getBoundingClientRect().top/travel)))};update();addEventListener('scroll',update,{passive:true});return()=>removeEventListener('scroll',update)},[menuOpen,booking])
  const chapter=getChapterAtProgress(progress)
  const goTo=id=>{const selected=CHAPTERS.find(item=>item.id===id),start=getProgressForChapter(id),p=selected?(start+selected.progressEnd)/2:start,el=track.current;if(!el)return;const travel=el.offsetHeight-innerHeight;scrollTo({top:el.offsetTop+p*travel,behavior:reducedMotion||innerWidth<768?'auto':'smooth'});setProgress(p)}
  const book=p=>{setPlan(p?.name||'');setBooking(true)}
  return <main className="experience"><section className="experience__track" ref={track}><div className="experience__stage"><div className="experience__sky"/><Hero3D progress={progress} reducedMotion={reducedMotion} onFallback={()=>setFallback(true)}/><div className="experience__grade"/>
    <ChapterContent chapter={chapter} progress={progress} onPlan={book} onBook={()=>book()}/><div className="chapter-counter">{String(CHAPTERS.indexOf(chapter)+1).padStart(2,'0')} / {String(CHAPTERS.length).padStart(2,'0')}</div><div className="scroll-signal">SCROLL TO TRAVEL<i/></div>
    {fallback&&<div className="journey-fallback" role="status">Cinematic fallback active.</div>}</div></section>
    <div className="edge-controls"><JourneyMenu open={menuOpen} onOpen={()=>setMenuOpen(true)} onClose={()=>setMenuOpen(false)} onSelect={goTo} onBook={()=>book()}/></div>
    <BookingOverlay open={booking} initialPlan={plan} onClose={()=>setBooking(false)}/></main>
}
