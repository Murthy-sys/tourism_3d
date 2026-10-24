import { useEffect, useRef } from 'react'
import { readRuntimeProfile } from '../three/runtimeProfile'

export default function Hero3D({
  progress,
  reducedMotion,
  onFallback,
  onReady,
  sceneRef,
  introPhase='complete',
  onIntroComplete,
  onFinaleProgress,
}) {
  const canvasRef = useRef(null)
  const apiRef = useRef(null)
  const callbacksRef=useRef({onFallback,onReady,onIntroComplete,onFinaleProgress,introPhase,progress,reducedMotion})
  callbacksRef.current={onFallback,onReady,onIntroComplete,onFinaleProgress,introPhase,progress,reducedMotion}
  const failedRef=useRef(false)
  const fallbackIntroCompleted=useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let sceneApi
    let releaseAssets
    let cancelled=false
    failedRef.current=false
    fallbackIntroCompleted.current=false
    const handleFallback=()=>{
      failedRef.current=true
      callbacksRef.current.onFallback?.()
      if(callbacksRef.current.introPhase==='playing'&&!fallbackIntroCompleted.current){
        fallbackIntroCompleted.current=true
        callbacksRef.current.onIntroComplete?.()
      }
    }
    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      sceneApi?.setPointer(nx, ny)
    }
    const onVisibility=()=>{
      if(document.hidden) sceneApi?.pause?.()
      else sceneApi?.resume?.()
    }
    const initialize=async()=>{
      const profile=readRuntimeProfile()
      const loadOptions={timeout:profile.assetTimeout}
      const travellerURL=`${import.meta.env.BASE_URL}models/traveller${profile.compactAssets?'-compact':''}.glb`
      let createIndiaJourney
      // Paint the lightweight gate before fetching/parsing the 3D engine.
      let travellers,nature,vehicles
      try{
        const modules=await Promise.all([
          import('../three/indiaJourney'),import('../three/realisticTravellers'),
          import('../three/natureAssets'),import('../three/realisticVehicles'),
        ])
        if(cancelled) return
        ;[{createIndiaJourney},travellers,nature,vehicles]=modules
      }catch(error){
        if(cancelled) return
        console.warn('3D engine unavailable:',error)
        handleFallback()
        callbacksRef.current.onReady?.()
        return
      }
      releaseAssets=()=>{
        travellers.releaseRealisticTravellers()
        nature.releaseNatureAssets()
        vehicles.releaseRealisticVehicles()
      }
      try{
        await Promise.all([
          travellers.preloadRealisticTravellers(travellerURL,loadOptions).catch(error=>{
            if(!cancelled) console.warn('Detailed traveller model unavailable:',error)
          }),
          nature.preloadNatureAssets({...loadOptions,compact:profile.compactAssets}),
          vehicles.preloadRealisticVehicles(profile.compactAssets?'mobile':'desktop',loadOptions).catch(error=>{
            if(!cancelled) console.warn('Detailed vehicle models unavailable:',error)
          }),
        ])
      }catch(error){
        // Keep the journey usable if the optional detailed model cannot load.
        if(!cancelled) console.warn('Detailed traveller model unavailable:',error)
      }
      if(cancelled) return
      try {
        sceneApi = createIndiaJourney(canvas,{
          runtimeProfile:profile,
          reducedMotion:callbacksRef.current.reducedMotion,
          intro:true,
          onContextLost:handleFallback,
          onReady:()=>callbacksRef.current.onReady?.(),
          onIntroComplete:()=>callbacksRef.current.onIntroComplete?.(),
          onFinaleProgress:value=>callbacksRef.current.onFinaleProgress?.(value),
        })
        apiRef.current = sceneApi
        if (sceneRef) sceneRef.current = sceneApi
        sceneApi.setIntroPhase(callbacksRef.current.introPhase)
        sceneApi.setProgress(callbacksRef.current.progress)
        window.__journeyQA=()=>sceneApi.getQASnapshot({
          consoleFailures:Array.isArray(window.__journeyConsoleFailures)
            ?window.__journeyConsoleFailures
            :[],
          audioControls:document.querySelectorAll([
            'audio',
            '[data-audio-control]',
            'button[aria-label*="sound" i]',
            'button[aria-label*="audio" i]',
          ].join(',')).length,
        })
        window.__resetJourneyQA=()=>{
          sceneApi.resetQAMetrics()
          if(Array.isArray(window.__journeyConsoleFailures)){
            window.__journeyConsoleFailures.length=0
          }
        }
        window.addEventListener('mousemove', onMove)
        document.addEventListener('visibilitychange',onVisibility)
        onVisibility()
      } catch (err) {
        // Keep the CSS journey available if the renderer cannot initialize.
        console.warn('India 3D journey failed to initialize:', err)
        handleFallback()
        callbacksRef.current.onReady?.()
      }
    }
    initialize()

    return () => {
      cancelled=true
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange',onVisibility)
      delete window.__journeyQA
      delete window.__resetJourneyQA
      sceneApi?.dispose()
      releaseAssets?.()
      apiRef.current = null
      if (sceneRef) sceneRef.current = null
    }
  }, [])

  useEffect(()=>{ apiRef.current?.setReducedMotion(reducedMotion) },[reducedMotion])
  useEffect(()=>{
    apiRef.current?.setIntroPhase(introPhase)
    if(failedRef.current&&introPhase==='playing'&&!fallbackIntroCompleted.current){
      fallbackIntroCompleted.current=true
      callbacksRef.current.onIntroComplete?.()
    }
  },[introPhase])
  useEffect(()=>{ apiRef.current?.setProgress(progress) },[progress,introPhase])

  return <canvas ref={canvasRef} className="journey__canvas" aria-hidden="true" />
}
