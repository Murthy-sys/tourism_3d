import { useEffect, useSyncExternalStore } from 'react'
import { getAmbientEnabled, setAmbientEnabled, subscribeAmbient } from '../audio/ambient'

export default function SoundToggle({ initialOn = false }) {
  const on = useSyncExternalStore(subscribeAmbient, getAmbientEnabled, () => false)
  useEffect(()=>{if(initialOn&&!getAmbientEnabled())setAmbientEnabled(true)},[initialOn])

  const toggle = () => {
    setAmbientEnabled(!on)
  }

  return (
    <button type="button" className={`sound-toggle ${on ? 'sound-toggle--on' : ''}`} onClick={toggle} aria-label="Toggle ambient sound">
      <span />
      <span />
      <span />
    </button>
  )
}
