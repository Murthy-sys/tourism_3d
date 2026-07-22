import { useState } from 'react'
import Preloader from './components/Preloader'
import IntroGate from './components/IntroGate'
import CustomCursor from './components/CustomCursor'
import JourneyShell from './components/JourneyShell'

// phase: 'loading' -> 'gate' -> 'site'
export default function App() {
  const [phase, setPhase] = useState('loading')
  const [soundOn, setSoundOn] = useState(false)

  return (
    <>
      {phase === 'loading' && <Preloader onDone={() => setPhase('gate')} />}
      {phase === 'gate' && (
        <IntroGate
          onEnter={(enteredSoundOn) => {
            setSoundOn(enteredSoundOn)
            setPhase('site')
          }}
        />
      )}
      <CustomCursor />
      {phase === 'site' && <JourneyShell soundOn={soundOn} />}
    </>
  )
}
