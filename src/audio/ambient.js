// Self-contained ambient drone built with the Web Audio API — no external
// audio files required. Meant to stand in for the "turn your sound on"
// touch that award-winning sites often use on their intro screen.
let ctx = null
let masterGain = null
let started = false
let enabledState = false
let environmentState = 'journey'
const environmentGains = {}
const listeners = new Set()

export const getAmbientEnabled = () => enabledState
export const getAmbientEnvironment = () => environmentState
export const subscribeAmbient = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function ensureContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0
    masterGain.connect(ctx.destination)
  }
  return ctx
}

export function startAmbient(enabled) {
  const audioCtx = ensureContext()
  if (!audioCtx) return

  if (!started) {
    started = true
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    filter.connect(masterGain)

    // two gently detuned low sine oscillators for a soft, airy drone
    ;[110, 110.6].forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const g = audioCtx.createGain()
      g.gain.value = i === 0 ? 0.5 : 0.35
      osc.connect(g)
      g.connect(filter)
      osc.start()
    })

    // slow amplitude drift for movement
    const lfo = audioCtx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = audioCtx.createGain()
    lfoGain.gain.value = 0.15
    lfo.connect(lfoGain)
    lfoGain.connect(masterGain.gain)
    lfo.start()

    const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),data=buffer.getChannelData(0)
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.45
    ;[['jungle','bandpass',1500,.055],['water','lowpass',420,.07],['mountain','highpass',2300,.045]].forEach(([name,type,frequency,level])=>{
      const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(masterGain);source.start();environmentGains[name]={gain,level}
    })
  }

  if (audioCtx.state === 'suspended') audioCtx.resume()
  setAmbientEnabled(enabled)
}

export function setAmbientEnabled(enabled) {
  enabledState = Boolean(enabled)
  listeners.forEach((listener) => listener(enabledState))
  if (!ctx || !masterGain) return
  const target = enabledState ? 0.18 : 0
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(target, now + 0.12)
}

export function setAmbientEnvironment(environment){
  environmentState=['journey','jungle','water','mountain'].includes(environment)?environment:'journey'
  listeners.forEach((listener)=>listener(enabledState,environmentState))
  if(!ctx)return
  const now=ctx.currentTime
  Object.entries(environmentGains).forEach(([name,{gain,level}])=>{gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(name===environmentState?level:0,now+.8)})
}
