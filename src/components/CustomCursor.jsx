import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motionPreference.matches
    let ringX = 0
    let ringY = 0
    let mouseX = 0
    let mouseY = 0
    let frameId = null
    let previousTime = null

    const stopAnimation = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = null
      previousTime = null
    }

    const placeRing = () => {
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`
    }

    const animate = (time) => {
      frameId = null
      const delta = Math.min(Math.max(time - previousTime, 0), 64)
      previousTime = time
      const blend = 1 - Math.pow(0.85, delta / (1000 / 60))
      ringX += (mouseX - ringX) * blend
      ringY += (mouseY - ringY) * blend

      if (Math.abs(mouseX - ringX) < 0.1 && Math.abs(mouseY - ringY) < 0.1) {
        ringX = mouseX
        ringY = mouseY
        previousTime = null
      } else {
        frameId = requestAnimationFrame(animate)
      }
      placeRing()
    }

    const onMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`
      if (reducedMotion) {
        ringX = mouseX
        ringY = mouseY
        placeRing()
      } else if (frameId === null && (ringX !== mouseX || ringY !== mouseY)) {
        previousTime = performance.now()
        frameId = requestAnimationFrame(animate)
      }
    }

    const onOver = (e) => {
      if (e.target.closest('a, button, .tilt-card, input, textarea')) {
        ring.classList.add('cursor-ring--active')
      } else {
        ring.classList.remove('cursor-ring--active')
      }
    }

    const onMotionPreferenceChange = (event) => {
      reducedMotion = event.matches
      if (reducedMotion) {
        stopAnimation()
        ringX = mouseX
        ringY = mouseY
        placeRing()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    motionPreference.addEventListener('change', onMotionPreferenceChange)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      motionPreference.removeEventListener('change', onMotionPreferenceChange)
      stopAnimation()
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}
