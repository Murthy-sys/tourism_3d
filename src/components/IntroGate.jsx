import { useRef } from 'react'

export default function IntroGate({ onEnter, enabled=true, leaving=false }) {
  const entered=useRef(false)

  const handleEnter = (event) => {
    if(!enabled||leaving||entered.current) return
    entered.current=true
    event.currentTarget.blur()
    onEnter?.()
  }

  return (
    <div className={`gate ${leaving ? 'gate--leaving' : ''}`} aria-hidden={!enabled||leaving} inert={!enabled||leaving?'':undefined}>
      <div className="gate__content">
        <p className="gate__eyebrow">XYZ Travellers · An India journey</p>
        <h1 className="gate__title">
          Begin your journey
          <br />
          <span>through India.</span>
        </h1>

        <button type="button" className="gate__enter" onClick={handleEnter} disabled={!enabled||leaving}>
          <span>Start</span>
          <i />
        </button>

        <div className="gate__foot">
          <span className="gate__hint">From the city rush to the quiet of the hills</span>
        </div>
      </div>
    </div>
  )
}
