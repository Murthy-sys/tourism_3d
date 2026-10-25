import * as THREE from 'three'
import { LANDMARKS,smootherstep } from './terrain'
import { mapJourneyZ } from './journeySpatial'

export const RIVER_LEVEL=.01
export const RIVER_START_Z=LANDMARKS.mountainLanding[2]
export const RIVER_END_Z=LANDMARKS.forestLanding[2]
// The journey begins and ends at jetties, not at the river's physical edges.
// Both continuations bend away from the dry approach routes.
export const RIVER_SURFACE_START_Z=RIVER_START_Z+20
export const RIVER_SURFACE_END_Z=RIVER_END_Z-22
const gaussian=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,2))

const riverCenterX=progress=>THREE.MathUtils.lerp(2,-2,progress)+
  Math.sin(progress*Math.PI)*(Math.sin(progress*Math.PI*2)*5.4+Math.sin(progress*Math.PI*5)*1.1)

// The boat follows the same bends that shape the banks. Additional samples keep
// its smooth rail inside the narrowing channel without stretching either deck.
export const createRiverRoute=()=>new THREE.CatmullRomCurve3(
  Array.from({length:17},(_,index)=>{
    if(index===0) return new THREE.Vector3(...LANDMARKS.mountainLanding)
    if(index===16) return new THREE.Vector3(...LANDMARKS.forestLanding)
    const progress=index/16
    return new THREE.Vector3(
      riverCenterX(progress)+Math.sin(progress*Math.PI*3)*.65,
      .2,
      THREE.MathUtils.lerp(RIVER_START_Z,RIVER_END_Z,progress),
    )
  }),false,'catmullrom',.42,
)

export const sampleRiverCrossSection=z=>{
  if(z>RIVER_START_Z){
    const t=THREE.MathUtils.clamp((z-RIVER_START_Z)/20,0,1)
    const rightX=1.2-22*smootherstep(0,1,t)
    const width=5.7+4*smootherstep(0,.6,t)
    return {centerX:rightX-width/2,leftX:rightX-width,rightX,width,level:RIVER_LEVEL,progress:0}
  }
  if(z<RIVER_END_Z){
    const downstream=RIVER_END_Z-z
    const rightX=1.3-6*smootherstep(2.2,5.2,downstream)-15*smootherstep(4,22,downstream)
    const width=10.3+1.2*smootherstep(0,12,downstream)
    return {centerX:rightX-width/2,leftX:rightX-width,rightX,width,level:RIVER_LEVEL,progress:1}
  }
  const progress=THREE.MathUtils.clamp((RIVER_START_Z-z)/(RIVER_START_Z-RIVER_END_Z),0,1)
  const opening=smootherstep(0,.19,progress)
  const centerX=riverCenterX(progress)-3*(1-opening)
  const inlet=smootherstep(.79,1,progress)
  const leftMain=6.8+1.1*Math.sin(progress*Math.PI*1.3+.3)+
    1.1*gaussian(progress,.43,.105)-.9*gaussian(progress,.69,.075)
  const rightMain=7.3+Math.sin(progress*Math.PI*2.1+1.2)+
    1.3*gaussian(progress,.73,.095)-.8*gaussian(progress,.3,.09)
  const left=THREE.MathUtils.lerp(THREE.MathUtils.lerp(3.5,leftMain,opening),7,inlet)
  const right=THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.2,rightMain,opening),3.3,inlet)
  return {centerX,leftX:centerX-left,rightX:centerX+right,width:left+right,level:RIVER_LEVEL,progress}
}

// Negative edge distance is wet. Bed height includes attached gravel bars, so
// terrain, shoreline placement and the surface shader can share one coastline.
export const sampleRiverSurface=(x,z)=>{
  const section=sampleRiverCrossSection(z)
  const lateralDistance=Math.max(section.leftX-x,x-section.rightX)
  const edgeDistance=Math.max(lateralDistance,z-RIVER_SURFACE_START_Z,RIVER_SURFACE_END_Z-z)
  const channelDepth=1.9+.32*Math.sin((z+58)*.13)
  const submerged=THREE.MathUtils.lerp(-.075,-channelDepth,smootherstep(0,3.4,-lateralDistance))
  const bankNoise=Math.sin(x*.39+z*.27)*.07+Math.sin(z*.82-x*.18)*.035
  const bankHeight=.035+smootherstep(0,5,lateralDistance)*(.55+bankNoise)+
    smootherstep(3,12,lateralDistance)*(.45+Math.sin(x*.17-z*.11)*.3)
  let bedHeight=THREE.MathUtils.lerp(submerged,bankHeight,smootherstep(-.45,.65,lateralDistance))
  const leftBar=gaussian(x,section.leftX+1.6,1.65)*gaussian(z,mapJourneyZ(-59.5),7.4)
  const rightBar=gaussian(x,section.rightX-1.2,1.45)*gaussian(z,mapJourneyZ(-72.4),4.8)
  bedHeight=THREE.MathUtils.lerp(bedHeight,.16,Math.max(leftBar,rightBar)*.96)
  return {
    edgeDistance,inside:edgeDistance<=0,level:RIVER_LEVEL,
    depth:Math.max(0,RIVER_LEVEL-bedHeight),bedHeight,
    barWeight:Math.max(leftBar,rightBar),
  }
}
