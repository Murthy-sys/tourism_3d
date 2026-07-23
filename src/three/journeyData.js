import { smootherstep } from './terrain'

const stop = (id, name, kicker, description, region, palette, camera, target) => ({
  id, name, kicker, description, region, href: '#destinations', palette, camera, target,
})

export const JOURNEY_STOPS = [
  stop('kerala', 'Kerala Backwaters', 'The journey begins in the south', 'Drift through palms, waterways and houseboat country.', 'south', { sky: '#8fc7c7', horizon: '#f4b27b', ground: '#245c4c', accent: '#ffd274' }, [0, 5, 18], [0, 1, 0]),
  stop('tamil-nadu', 'Tamil Nadu', 'Temple country', 'Enter a skyline shaped by ancient gopurams and living traditions.', 'south', { sky: '#89b9c9', horizon: '#ed9669', ground: '#8b4d35', accent: '#ffcc75' }, [9, 5, 3], [9, 2, -12]),
  stop('hampi', 'Hampi & the Deccan', 'Stone, story and empire', 'Cross boulder fields and the monumental remains of Vijayanagara.', 'deccan', { sky: '#7998b7', horizon: '#df815e', ground: '#8f4937', accent: '#f5bd69' }, [-8, 6, -16], [-5, 1, -29]),
  stop('goa', 'Goa Coast', 'Where the road meets the sea', 'Follow palms, bright facades and the Arabian Sea.', 'deccan', { sky: '#74abc4', horizon: '#f1a66f', ground: '#2f6470', accent: '#ffd87a' }, [8, 5, -34], [10, 1, -48]),
  stop('mumbai', 'Mumbai', 'Gateway to the west', 'Arrive at a harbor shaped by movement, ambition and history.', 'west-north', { sky: '#627f9f', horizon: '#df805f', ground: '#4a4d5e', accent: '#ffc46e' }, [-6, 6, -52], [-4, 2, -66]),
  stop('rajasthan', 'Rajasthan', 'Fortresses of the desert', 'Travel through ochre dunes, palace walls and desert light.', 'west-north', { sky: '#887993', horizon: '#df7759', ground: '#9e663b', accent: '#ffd078' }, [8, 6, -70], [7, 2, -84]),
  stop('agra', 'Agra', 'An icon in marble', 'Pause before the symmetry and calm of the Taj Mahal.', 'west-north', { sky: '#8098ad', horizon: '#efa082', ground: '#767b77', accent: '#fff0c8' }, [-5, 5, -88], [-3, 2, -102]),
  stop('varanasi', 'Varanasi', 'Light along the Ganges', 'Move past river steps, boats and the glow of evening rituals.', 'ganges', { sky: '#5d6684', horizon: '#df704f', ground: '#59454d', accent: '#ffbf59' }, [7, 5, -106], [7, 1, -120]),
  stop('hill-country', 'Forested Hill Country', 'The journey enters the canopy', 'Finish among forested ridges, mist-filled valleys and winding green trails.', 'hill-country', { sky: '#4f6682', horizon: '#cc8e7c', ground: '#34464a', accent: '#eef8ff' }, [0, 8, -126], [0, 3, -140]),
]

export const CAMERA_KEYFRAMES = JOURNEY_STOPS.map(({ camera, target }) => ({ camera, target }))
export const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => a.map((value, index) => lerp(value, b[index], t))
const CINEMATIC_KEYFRAMES=[
  {p:0,camera:[5,7,20],target:[0,5.9,12]},
  {p:.18,camera:[8,5.5,-14],target:[0,2,-24]},
  {p:.28,camera:[9,4.8,-25],target:[2,1,-34]},
  {p:.35,camera:[7,4.2,-27],target:[2,1,-34]},
  {p:.42,camera:[-4,4,-27],target:[2,1,-34]},
  {p:.52,camera:[8,3,-51],target:[0,1,-59]},
  {p:.60,camera:[-8,4,-78],target:[-2,1,-86]},
  {p:.67,camera:[5,3.5,-78],target:[-2,1,-86]},
  {p:.74,camera:[7,4,-82],target:[-2,1,-86]},
  {p:.84,camera:[8,4,-105],target:[0,1,-114]},
  {p:.94,camera:[8,5,-124],target:[1,1,-132]},
  {p:1,camera:[8,5,-124],target:[1,1,-132]},
]
const cinematicState=value=>{
  const found=CINEMATIC_KEYFRAMES.findIndex(keyframe=>value<=keyframe.p)
  const nextIndex=Math.max(1,found<0?CINEMATIC_KEYFRAMES.length-1:found)
  const a=CINEMATIC_KEYFRAMES[nextIndex-1]
  const b=CINEMATIC_KEYFRAMES[nextIndex]
  const t=smootherstep(a.p,b.p,value)
  return{cameraPosition:lerp3(a.camera,b.camera,t),cameraTarget:lerp3(a.target,b.target,t)}
}

export function getExpeditionState(progress){
  const p=clamp01(progress)
  if(p<.28)return{phase:'mountain-trek',biome:'mountain',activeTransport:'trekker',localProgress:p/.28}
  if(p<.42)return{phase:'trek-to-boat',biome:'mountain-water',activeTransport:'trekker',localProgress:(p-.28)/.14}
  if(p<.60)return{phase:'water-boat',biome:'water',activeTransport:'boat',localProgress:(p-.42)/.18}
  if(p<.74)return{phase:'boat-to-jeep',biome:'water-forest',activeTransport:'boat',localProgress:(p-.60)/.14}
  if(p<.94)return{phase:'forest-jeep',biome:'forest',activeTransport:'jeep',localProgress:(p-.74)/.20}
  return{phase:'contact',biome:'forest',activeTransport:'jeep',localProgress:(p-.94)/.06}
}

export function getJourneyState(progress) {
  const value = clamp01(progress)
  const scaled = value * (JOURNEY_STOPS.length - 1)
  const activeIndex = Math.min(Math.floor(scaled), JOURNEY_STOPS.length - 1)
  const nextIndex = Math.min(activeIndex + 1, JOURNEY_STOPS.length - 1)
  const localProgress = nextIndex === activeIndex ? 1 : scaled - activeIndex
  const current = JOURNEY_STOPS[activeIndex]
  const next = JOURNEY_STOPS[nextIndex]
  const expedition=getExpeditionState(value)
  const phase=expedition.phase==='contact'
    ?'contact'
    :expedition.biome.includes('-')
      ?'handoff'
      :expedition.biome
  const planFocus=value<.42?0:value<.74?1:2
  return { activeIndex, activeStop: current, localProgress, phase, planFocus, contentVisible:true, expedition, ...cinematicState(value), palette: current.palette }
}
