import { useState } from 'react'
import { startAmbient } from '../audio/ambient'

export default function IntroGate({ onEnter }) {
  const [soundOn, setSoundOn] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const handleEnter = () => {
    startAmbient(soundOn)
    setLeaving(true)
    setTimeout(() => onEnter(soundOn), 900)
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
          <button
            type="button"
            className={`gate__sound ${soundOn ? 'gate__sound--on' : ''}`}
            onClick={() => setSoundOn((s) => !s)}
          >
            <span className="gate__sound-dot" />
            {soundOn ? 'Sound on' : 'Turn your sound on'}
          </button>
          <span className="gate__hint">Best experienced on desktop</span>
        </div>
      </div>
    </div>
  )
}
