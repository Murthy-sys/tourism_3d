import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import Preloader from './components/Preloader'
import IntroGate from './components/IntroGate'
import CustomCursor from './components/CustomCursor'
import JourneyShell from './components/JourneyShell'

// Keep the opaque gate mounted until the cloud-to-road introduction starts.
export default function App() {
  const [phase, setPhase] = useState('loading')
  const [journeyReady,setJourneyReady]=useState(false)
  const [loadingState,setLoadingState]=useState({phase:'assets',completed:0,total:0})
  const [loadAttempt,setLoadAttempt]=useState(0)
  const skipRef=useRef(null)
  const handleReady=useCallback(()=>setJourneyReady(true),[])
  const handleLoadingState=useCallback(status=>{
    setLoadingState(status)
    if(status.phase==='error') setJourneyReady(false)
  },[])
  const retryLoading=useCallback(()=>{
    setJourneyReady(false)
    setLoadingState({phase:'assets',completed:0,total:0})
    setLoadAttempt(attempt=>attempt+1)
  },[])
  const handleLoaded=useCallback(()=>setPhase(current=>current==='loading'?'gate':current),[])
  const handleEnter=useCallback(()=>setPhase(current=>current==='gate'?'intro':current),[])
  const handleIntroComplete=useCallback(()=>setPhase(current=>current==='intro'?'site':current),[])
  const introPhase=phase==='site'?'complete':phase==='intro'?'playing':'waiting'
  useLayoutEffect(()=>{
    if(phase==='intro') skipRef.current?.focus({preventScroll:true})
  },[phase])

  return (
    <>
      <JourneyShell
        onReady={handleReady}
        onLoadingState={handleLoadingState}
        loadAttempt={loadAttempt}
        introPhase={introPhase}
        onIntroComplete={handleIntroComplete}
      />
      {phase !== 'site' && (
        <IntroGate
          enabled={phase==='gate'}
          leaving={phase==='intro'}
          onEnter={handleEnter}
        />
      )}
      {phase === 'loading' && (
        <Preloader
          ready={journeyReady}
          status={loadingState}
          onRetry={retryLoading}
          onDone={handleLoaded}
        />
      )}
      {phase==='intro'&&<button ref={skipRef} type="button" className="intro-skip" onClick={handleIntroComplete}>Skip introduction</button>}
      <CustomCursor />
    </>
  )
}
