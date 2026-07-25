import { useState } from 'react'
import Preloader from './components/Preloader'
import IntroGate from './components/IntroGate'
import CustomCursor from './components/CustomCursor'
import JourneyShell from './components/JourneyShell'

// phase: 'loading' -> 'gate' -> 'site'
export default function App() {
  const [phase, setPhase] = useState('loading')
  const [journeyReady,setJourneyReady]=useState(false)

  return (
    <>
      <JourneyShell onReady={()=>setJourneyReady(true)}/>
      {phase === 'loading' && (
        <Preloader
          ready={journeyReady}
          onDone={()=>setPhase('gate')}
        />
      )}
      {phase === 'gate' && (
        <IntroGate
          onEnter={() => setPhase('site')}
        />
      )}
      <CustomCursor />
    </>
  )
}
