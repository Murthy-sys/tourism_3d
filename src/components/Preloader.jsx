import { useEffect, useRef, useState } from 'react'

export default function Preloader({ready=false,status={},onRetry,onDone}) {
  const [leaving,setLeaving]=useState(false)
  const onDoneRef=useRef(onDone)
  const assetGroups=useRef(5)
  useEffect(()=>{onDoneRef.current=onDone},[onDone])
  const failed=status.phase==='error'
  const preparing=status.phase==='preparing'
  const measured=Number.isFinite(status.total)&&status.total>0
  if(status.phase==='assets'&&measured) assetGroups.current=status.total
  // Completed asset groups and scene preparation are real work units. Reserve
  // the final percent for the renderer's ready signal, never a timer.
  const fraction=measured?Math.min(1,Math.max(0,status.completed/status.total)):0
  const completedTasks=preparing?assetGroups.current+fraction:fraction*assetGroups.current
  const percentage=ready?100:Math.min(99,Math.floor(completedTasks/(assetGroups.current+1)*100))
  const label=failed?'Your journey could not finish loading'
    :ready?'Your journey is ready'
    :preparing?'Preparing every scene':'Loading your journey'

  useEffect(()=>{
    if(!ready||failed){setLeaving(false);return}
    const leaveTimer=setTimeout(()=>setLeaving(true),200)
    const doneTimer=setTimeout(()=>onDoneRef.current?.(),750)
    return ()=>{
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  },[ready,failed])

  return (
    <div className={`preloader${leaving?' preloader--leaving':''}${failed?' preloader--error':''}`}>
      <div className="preloader__compass" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="64" height="64">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M50 20 L58 50 L50 80 L42 50 Z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
      <div className="preloader__count" aria-hidden="true">{failed?'Paused':measured||ready?`${percentage}%`:'Loading'}</div>
      <div className="preloader__label" role={failed?'alert':'status'} aria-live="polite">{label}</div>
      <p className="preloader__detail">{failed
        ?'Check your connection, then try again. Your journey has not started.'
        :ready?'All scenery and travellers are ready.'
        :preparing?'Getting the journey ready for smooth travel.'
        :'Loading the scenery and travellers before you begin.'}</p>
      {!failed&&<div className="preloader__bar" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={measured||ready?percentage:undefined}>
        <div className="preloader__bar-fill" style={{width:`${percentage}%`}}/>
      </div>}
      {failed&&<button type="button" className="preloader__retry" onClick={onRetry}>Retry loading</button>}
    </div>
  )
}
