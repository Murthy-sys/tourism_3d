import { smootherstep } from './terrain'
import { shiftFinaleZ } from './journeySpatial'

export const FOREST_DRIVE_END=.90
export const FINALE_WALK_END=.97
export const FINALE_GROUND_Y=.185
export const WATERFALL=Object.freeze({
  center:Object.freeze([1,0,shiftFinaleZ(-151)]),
  height:16,
  width:4.8,
  pool:Object.freeze([1,.08,shiftFinaleZ(-147.5)]),
  poolRadius:Object.freeze([7,4.8]),
})
// A river leaves the pool on the far side of the viewing bank. Samples are shared
// by the water mesh, carved terrain and vegetation placement.
const outflowControls=[
  [1+7*Math.cos(.7),-147.5,4.8*Math.sin(.7),.08],
  [11,-147.5,2.7,.06],
  [20,-145.8,2.35,.015],
  [31,-146.6,2.5,-.04],
  [44,-144.5,2.7,-.1],
  [58,-145,3,-.17],
  [77,-149,3.2,-.25],
].map(([x,z,width,level])=>[x,shiftFinaleZ(z),width,level])
const catmull=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
export const WATERFALL_OUTFLOW=Object.freeze(Array.from({length:73},(_,index)=>{
  const progress=index/72*(outflowControls.length-1)
  const segment=Math.min(outflowControls.length-2,Math.floor(progress))
  const t=progress-segment
  const points=[Math.max(0,segment-1),segment,segment+1,Math.min(outflowControls.length-1,segment+2)]
    .map(i=>outflowControls[i])
  return Object.freeze(Array.from({length:4},(_,axis)=>catmull(...points.map(point=>point[axis]),t)))
}))

export const sampleFinaleWater=(x,z)=>{
  const poolDistance=Math.hypot((x-WATERFALL.pool[0])/7,(z-WATERFALL.pool[2])/4.8)
  let distance=poolDistance,level=WATERFALL.pool[1],edgeDistance=(poolDistance-1)*4.8
  for(let i=1;i<WATERFALL_OUTFLOW.length;i++){
    const a=WATERFALL_OUTFLOW[i-1],b=WATERFALL_OUTFLOW[i]
    const dx=b[0]-a[0],dz=b[1]-a[1]
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)))
    const halfWidth=a[2]+(b[2]-a[2])*t
    const offset=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)
    edgeDistance=Math.min(edgeDistance,offset-halfWidth)
    if(offset/halfWidth<distance){
      distance=offset/halfWidth
      level=a[3]+(b[3]-a[3])*t
    }
  }
  return{distance,level,edgeDistance}
}
export const WATERFALL_VIEWING_POSITIONS=Object.freeze([
  Object.freeze([-3,FINALE_GROUND_Y,shiftFinaleZ(-139)]),
  Object.freeze([-1,FINALE_GROUND_Y,shiftFinaleZ(-140)]),
  Object.freeze([1,FINALE_GROUND_Y,shiftFinaleZ(-139)]),
  Object.freeze([3,FINALE_GROUND_Y,shiftFinaleZ(-140)]),
])
export const FINALE_CAMERAS=Object.freeze({
  desktop:Object.freeze({camera:[17,9,shiftFinaleZ(-119)],target:[-4,5,shiftFinaleZ(-145)]}),
  mobile:Object.freeze({camera:[12,12,shiftFinaleZ(-111)],target:[0,9.5,shiftFinaleZ(-145)]}),
})

// The pool is cut into the terrain; the approach remains a level, grounded clearing.
export const getFinaleGroundHeight=(x,z)=>{
  const water=sampleFinaleWater(x,z)
  if(water.distance<=1){
    return water.level-.95*(1-smootherstep(.55,1,water.distance))
  }
  return water.level+(FINALE_GROUND_Y-water.level)*smootherstep(1,1.25,water.distance)
}

export const getFinaleProgress=progress=>
  Math.max(0,Math.min(1,(progress-FOREST_DRIVE_END)/(FINALE_WALK_END-FOREST_DRIVE_END)))
