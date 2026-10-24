import * as THREE from 'three'
import { LANDMARKS,smootherstep } from './terrain'

export const RIVER_LEVEL=.01
export const RIVER_START_Z=LANDMARKS.mountainLanding[2]
export const RIVER_END_Z=LANDMARKS.forestLanding[2]
const gaussian=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,2))

// Navigation remains independent of the broader, slower-changing river valley.
export const createRiverRoute=()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(...LANDMARKS.mountainLanding),
  new THREE.Vector3(6.4,.2,-45),
  new THREE.Vector3(-4.8,.18,-58),
  new THREE.Vector3(4.2,.2,-72),
  new THREE.Vector3(...LANDMARKS.forestLanding),
],false,'catmullrom',.42)

export const sampleRiverCrossSection=z=>{
  const progress=THREE.MathUtils.clamp((RIVER_START_Z-z)/(RIVER_START_Z-RIVER_END_Z),0,1)
  const centerX=THREE.MathUtils.lerp(2,-2,progress)+Math.sin(progress*Math.PI)*
    (Math.sin(progress*Math.PI*2)*1.1+Math.sin(progress*Math.PI*5)*.55)
  const opening=smootherstep(0,.19,progress)
  const inlet=smootherstep(.79,1,progress)
  const leftMain=17.4+2.7*Math.sin(progress*Math.PI*1.3+.3)+
    2.2*gaussian(progress,.43,.105)-2.1*gaussian(progress,.69,.075)
  const rightMain=18+2.4*Math.sin(progress*Math.PI*2.1+1.2)+
    3.1*gaussian(progress,.73,.095)-1.7*gaussian(progress,.3,.09)
  const left=THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.1,leftMain,opening),2.8,inlet)
  const right=THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.7,rightMain,opening),3.3,inlet)
  return {centerX,leftX:centerX-left,rightX:centerX+right,width:left+right,level:RIVER_LEVEL,progress}
}

// Negative edge distance is wet. Bed height includes attached gravel bars, so
// terrain, shoreline placement and the surface shader can share one coastline.
export const sampleRiverSurface=(x,z)=>{
  const section=sampleRiverCrossSection(z)
  const lateralDistance=Math.max(section.leftX-x,x-section.rightX)
  const edgeDistance=Math.max(lateralDistance,z-RIVER_START_Z,RIVER_END_Z-z)
  const channelDepth=1.9+.32*Math.sin((z+58)*.13)
  const submerged=THREE.MathUtils.lerp(-.075,-channelDepth,smootherstep(0,5.5,-lateralDistance))
  const bankNoise=Math.sin(x*.39+z*.27)*.07+Math.sin(z*.82-x*.18)*.035
  const bankHeight=.035+smootherstep(0,5,lateralDistance)*(.55+bankNoise)+
    smootherstep(3,12,lateralDistance)*(.45+Math.sin(x*.17-z*.11)*.3)
  let bedHeight=THREE.MathUtils.lerp(submerged,bankHeight,smootherstep(-.45,.65,lateralDistance))
  const leftBar=gaussian(x,section.leftX+1.6,1.65)*gaussian(z,-59.5,5.7)
  const rightBar=gaussian(x,section.rightX-1.2,1.45)*gaussian(z,-72.4,3.5)
  bedHeight=THREE.MathUtils.lerp(bedHeight,.16,Math.max(leftBar,rightBar)*.96)
  return {
    edgeDistance,inside:edgeDistance<=0,level:RIVER_LEVEL,
    depth:Math.max(0,RIVER_LEVEL-bedHeight),bedHeight,
    barWeight:Math.max(leftBar,rightBar),
  }
}
