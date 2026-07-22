import { useEffect, useRef } from 'react'
import { createIndiaJourney } from '../three/indiaJourney'

export default function Hero3D({progress,reducedMotion,onFallback}) {
  const canvasRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let sceneApi
    try {
      sceneApi = createIndiaJourney(canvas,{reducedMotion,onContextLost:onFallback})
      apiRef.current = sceneApi
    } catch (err) {
      // WebGL unavailable — fail silently, CSS hero background still works
      console.warn('India 3D journey failed to initialize:', err)
      onFallback?.()
      return
    }

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      sceneApi.setPointer(nx, ny)
    }
    window.addEventListener('mousemove', onMove)

    return () => {
      window.removeEventListener('mousemove', onMove)
      sceneApi.dispose()
      apiRef.current = null
    }
  }, [])

  useEffect(()=>{ apiRef.current?.setProgress(progress) },[progress])
  useEffect(()=>{ apiRef.current?.setReducedMotion(reducedMotion) },[reducedMotion])

  return <canvas ref={canvasRef} className="journey__canvas" aria-hidden="true" />
}
