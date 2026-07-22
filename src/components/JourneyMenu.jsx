import { useEffect } from 'react'
import { CHAPTERS } from '../journey/chapters'

export default function JourneyMenu({open,onOpen,onClose,onSelect,onBook}){
  useEffect(()=>{const key=e=>e.key==='Escape'&&onClose?.();document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose])
  return <>
    <button className="edge-menu-button" aria-label={open?'Close journey menu':'Open journey menu'} onClick={open?onClose:onOpen}><i/><i/><i/><span>menu</span></button>
    {open&&<div className="journey-menu" role="dialog" aria-modal="true" aria-label="Journey menu"><div className="journey-menu__items">
      {CHAPTERS.map((c,i)=><button key={c.id} aria-label={c.menuLabel} onClick={()=>{onSelect(c.id);onClose?.()}}><span>{String(i+1).padStart(2,'0')}</span><b>{c.menuLabel}</b></button>)}
      <button aria-label="Plan a Trip" onClick={()=>{onBook();onClose?.()}}><span>08</span><b>Plan a Trip</b></button>
    </div></div>}
  </>
}
