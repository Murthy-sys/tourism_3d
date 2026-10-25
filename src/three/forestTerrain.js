import * as THREE from 'three'
import { LANDMARKS,smootherstep } from './terrain'
import { getFinaleGroundHeight,sampleFinaleWater } from './finaleConfig'
import { sampleRiverSurface,RIVER_SURFACE_END_Z } from './riverConfig'
import { mapJourneyZ,shiftFinaleZ } from './journeySpatial'

const routeSamples=new WeakMap()

export const createForestRoute=()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(...LANDMARKS.forestLanding),
  new THREE.Vector3(-1.1,.22,mapJourneyZ(-92)),
  new THREE.Vector3(.9,.2,mapJourneyZ(-99)),
  new THREE.Vector3(-.65,.2,mapJourneyZ(-106)),
  new THREE.Vector3(1.25,.19,mapJourneyZ(-114)),
  new THREE.Vector3(-.8,.18,mapJourneyZ(-123)),
  new THREE.Vector3(...LANDMARKS.forestEnd),
])

export const distanceToForestRoute=(route,x,z)=>{
  if(!routeSamples.has(route)) routeSamples.set(route,route.getSpacedPoints(1200))
  let closestSquared=Infinity
  for(const point of routeSamples.get(route)){
    closestSquared=Math.min(closestSquared,(x-point.x)**2+(z-point.z)**2)
  }
  return Math.sqrt(closestSquared)
}

export const sampleForestGroundHeight=(route,x,z)=>{
  const shoulder=smootherstep(2.4,10,distanceToForestRoute(route,x,z))
  const roll=shoulder*(1.45+Math.sin(x*.18+z*.09)*.65+
    Math.cos(z*.22-x*.1)*.38+Math.sin(x*.47+z*.36)*.12)
  const approach=.07+roll
  if(z>=shiftFinaleZ(-128)){
    if(z<=LANDMARKS.forestLanding[2]&&z>=RIVER_SURFACE_END_Z){
      const river=sampleRiverSurface(x,z)
      return THREE.MathUtils.lerp(approach,river.bedHeight,1-smootherstep(0,2,river.edgeDistance))
    }
    return approach
  }
  const dryBank=smootherstep(1.5,2.3,sampleFinaleWater(x,z).distance)
  const finale=getFinaleGroundHeight(x,z)+roll*smootherstep(9,18,Math.abs(x-1))*dryBank
  return THREE.MathUtils.lerp(approach,finale,smootherstep(-shiftFinaleZ(-128),-shiftFinaleZ(-132),-z))
}

// The river owns the incoming side of this seam; the forest owns its far side.
export const sampleLandingGroundHeight=(route,x,z)=>{
  const forestHeight=sampleForestGroundHeight(route,x,z)
  if(z<=LANDMARKS.forestLanding[2]) return forestHeight
  const river=sampleRiverSurface(x,z)
  const channelMask=1-smootherstep(0,2,river.edgeDistance)
  const shore=smootherstep(-mapJourneyZ(-76),-LANDMARKS.forestLanding[2],-z)*(1-channelMask)
  const mountainBank=smootherstep(-34,-31,z)
  const height=THREE.MathUtils.lerp(river.bedHeight,.35,mountainBank*(1-channelMask))
  return THREE.MathUtils.lerp(height,forestHeight,shore)
}

export const getLandingTerrainX=(unitX,halfWidth=80,focusWidth=8)=>{
  const distance=Math.abs(unitX)
  const x=distance<=.65?distance/.65*focusWidth:focusWidth+(distance-.65)/.35*(halfWidth-focusWidth)
  return Math.sign(unitX)*x
}

export const refineForestLandingGeometry=(geometry,route)=>{
  const positions=geometry.getAttribute('position'),colors=geometry.getAttribute('color'),uvs=geometry.getAttribute('uv')
  const earth=new THREE.Color('#676147'),moss=new THREE.Color('#596443'),color=new THREE.Color()
  for(let index=0;index<positions.count;index+=1){
    const z=positions.getZ(index)
    if(z<=LANDMARKS.forestLanding[2]-10) continue
    const originalX=positions.getX(index)
    const x=THREE.MathUtils.lerp(originalX,getLandingTerrainX(originalX/80),1-smootherstep(-LANDMARKS.forestLanding[2],-LANDMARKS.forestLanding[2]+10,-z))
    positions.setXYZ(index,x,sampleForestGroundHeight(route,x,z),z)
    color.copy(earth).lerp(moss,.5+Math.sin(x*.23+Math.sin(z*.17))*Math.cos(z*.27-x*.11)*.35)
    colors.setXYZ(index,color.r,color.g,color.b)
    uvs.setXY(index,x/2,z/2)
  }
  geometry.computeVertexNormals()
  return geometry
}

export const matchLandingBoundaryNormals=(geometry,route)=>{
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal')
  const normal=new THREE.Vector3()
  const z=LANDMARKS.forestLanding[2],step=.1
  for(let index=0;index<positions.count;index+=1){
    if(Math.abs(positions.getZ(index)-z)>1e-5) continue
    const x=positions.getX(index)
    const dx=(sampleLandingGroundHeight(route,x+step,z)-sampleLandingGroundHeight(route,x-step,z))/(2*step)
    const dz=(sampleLandingGroundHeight(route,x,z+step)-sampleLandingGroundHeight(route,x,z-step))/(2*step)
    normal.set(-dx,1,-dz).normalize()
    normals.setXYZ(index,normal.x,normal.y,normal.z)
  }
  return geometry
}
