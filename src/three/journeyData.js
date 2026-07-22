import {smoothstep} from './terrain'

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
  stop('himalayas', 'Hill Country Trek', 'The journey rises', 'Finish among forested ridges, mist-filled valleys and winding green trails.', 'himalayas', { sky: '#4f6682', horizon: '#cc8e7c', ground: '#34464a', accent: '#eef8ff' }, [0, 8, -126], [0, 3, -140]),
]

export const CAMERA_KEYFRAMES = JOURNEY_STOPS.map(({ camera, target }) => ({ camera, target }))
export const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => a.map((value, index) => lerp(value, b[index], t))
const CINEMATIC_KEYFRAMES=[
  {p:0,camera:[5,3.2,15],target:[0,1,4]},
  {p:.08,camera:[4,2.8,1],target:[0,1,-8]},
  {p:.18,camera:[-10,5,-10],target:[0,1.7,-24]},
  {p:.25,camera:[-11,5.2,-12],target:[0,1.7,-24]},
  {p:.38,camera:[8,6,-32],target:[0,2,-50]},
  {p:.48,camera:[0,3.4,-41],target:[0,1.5,-53]},
  {p:.57,camera:[8,4,-62],target:[1.7,1,-72.5]},
  {p:.595,camera:[7,4,-66],target:[.8,1.22,-76.55]},
  {p:.62,camera:[-5,4,-68],target:[4.8,1,-76.55]},
  {p:.66,camera:[15,4,-84],target:[7.8,1,-92.5]},
  {p:.70,camera:[-2,4,-98],target:[7.8,1,-108.55]},
  {p:.725,camera:[3,5,-98],target:[11.1,1.52,-108.55]},
  {p:.75,camera:[7,5,-98],target:[14.4,1,-108.55]},
  {p:.82,camera:[9,8,-120],target:[18.93,3.4,-129.48]},
  {p:.92,camera:[17,17,-144],target:[26.39,13.3,-154.55]},
  {p:1,camera:[34,17,-145],target:[26.39,14,-154.55]},
]
const cinematicState=value=>{const nextIndex=Math.max(1,CINEMATIC_KEYFRAMES.findIndex(k=>value<=k.p)),a=CINEMATIC_KEYFRAMES[nextIndex-1],b=CINEMATIC_KEYFRAMES[nextIndex],t=smoothstep(0,1,(value-a.p)/Math.max(.0001,b.p-a.p));return{cameraPosition:lerp3(a.camera,b.camera,t),cameraTarget:lerp3(a.target,b.target,t)}}

export function getExpeditionState(progress){
  const p=clamp01(progress)
  if(p<.38)return{progress:p,phase:'ambassador',activeTransport:'ambassador',handoff:null,localProgress:p/.38}
  if(p<.41)return{progress:p,phase:'ambassador-to-jeep',activeTransport:'ambassador',handoff:'ambassador-to-jeep',localProgress:(p-.38)/.03}
  if(p<.57)return{progress:p,phase:'jungle-jeep',activeTransport:'jeep',handoff:null,localProgress:(p-.41)/.16}
  if(p<.62)return{progress:p,phase:'jeep-to-boat',activeTransport:'jeep',handoff:'jeep-to-boat',localProgress:(p-.57)/.05}
  if(p<.70)return{progress:p,phase:'water-boat',activeTransport:'boat',handoff:null,localProgress:(p-.62)/.08}
  if(p<.75)return{progress:p,phase:'boat-to-trek',activeTransport:'boat',handoff:'boat-to-trek',localProgress:(p-.70)/.05}
  if(p<.92)return{progress:p,phase:'hill-trek',activeTransport:'trekker',handoff:null,localProgress:(p-.75)/.17}
  return{progress:p,phase:'contact',activeTransport:'trekker',handoff:null,localProgress:(p-.92)/.08}
}

export function getJourneyState(progress) {
  const value = clamp01(progress)
  const scaled = value * (JOURNEY_STOPS.length - 1)
  const activeIndex = Math.min(Math.floor(scaled), JOURNEY_STOPS.length - 1)
  const nextIndex = Math.min(activeIndex + 1, JOURNEY_STOPS.length - 1)
  const localProgress = nextIndex === activeIndex ? 1 : scaled - activeIndex
  const current = JOURNEY_STOPS[activeIndex]
  const next = JOURNEY_STOPS[nextIndex]
  const expedition=getExpeditionState(value),phase=value<.18?'vehicle-intro':value<.38?'operations':value<.92?'plans':'contact'
  const planFocus=value<.62?0:value<.75?1:2
  return { activeIndex, activeStop: current, localProgress, phase, planFocus:phase==='plans'?planFocus:null, vehicleVisible:true, contentVisible:value>=.18, expedition, ...cinematicState(value), palette: current.palette }
}
