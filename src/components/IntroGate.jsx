import { useState } from 'react'

export default function IntroGate({ onEnter }) {
  const [leaving, setLeaving] = useState(false)

  const handleEnter = () => {
    setLeaving(true)
    setTimeout(() => onEnter(), 900)
  }

  return (
    <div className={`gate ${leaving ? 'gate--leaving' : ''}`}>
      <div className="gate__noise" />
      <div className="gate__content">
        <p className="gate__eyebrow">WanderLux · An India journey</p>
        <h1 className="gate__title">
          Begin your journey
          <br />
          <span>through India.</span>
        </h1>

        <button className="gate__enter" onClick={handleEnter}>
          <span>Start</span>
          <i />
        </button>

        <div className="gate__foot">
          <span className="gate__hint">Best experienced on desktop</span>
        </div>
      </div>
    </div>
  )
}
