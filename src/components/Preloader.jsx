import { useEffect, useState } from 'react'

export default function Preloader({ready=false,onDone}) {
  const [count, setCount] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c=>c>=95?c:c+Math.max(1,Math.ceil((95-c)*.08)))
    }, 90)
    return () => clearInterval(interval)
  }, [])

  useEffect(()=>{
    if(!ready) return
    setCount(100)
    const leaveTimer=setTimeout(()=>setLeaving(true),200)
    const doneTimer=setTimeout(()=>onDone(),750)
    return ()=>{
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  },[ready,onDone])

  return (
    <div className={`preloader ${leaving ? 'preloader--leaving' : ''}`}>
      <div className="preloader__compass">
        <svg viewBox="0 0 100 100" width="64" height="64">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M50 20 L58 50 L50 80 L42 50 Z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
      <div className="preloader__count">{count >= 100 ? 100 : count}</div>
      <div className="preloader__label">Heritage · Nature · Culture · Adventure</div>
      <div className="preloader__bar">
        <div className="preloader__bar-fill" style={{ width: `${Math.min(count, 100)}%` }} />
      </div>
    </div>
  )
}
