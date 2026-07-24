import * as THREE from 'three'

export const LANDMARKS=Object.freeze({
  trailheadStart:Object.freeze([3.2,.35,34]),
  mountainEntry:Object.freeze([2,3.1,22]),
  mountainStart:Object.freeze([0,5,12]),
  mountainLanding:Object.freeze([2,.35,-34]),
  forestLanding:Object.freeze([-2,.25,-86]),
  forestEnd:Object.freeze([1,.2,-132]),
})

export const smootherstep=(a,b,value)=>{
  const t=THREE.MathUtils.clamp((value-a)/(b-a||1),0,1)
  return t*t*t*(t*(t*6-15)+10)
}

const ridge=(x,z)=>
  Math.sin(x*.17+Math.sin(z*.08))*2.5+
  Math.cos(z*.11-x*.09)*1.8+
  Math.sin((x+z)*.29)*.65

const baseMountainHeight=(x,z)=>
  Math.max(0,(ridge(x,z)+4.4)*smootherstep(-38,8,z))

const openingCenterX=z=>
  THREE.MathUtils.lerp(0,3.2,smootherstep(12,34,z))

const openingFloor=z=>
  THREE.MathUtils.lerp(5,.35,smootherstep(12,34,z))

export const sampleMountainHeight=(x,z)=>{
  const base=baseMountainHeight(x,z)
  const corridorEnvelope=
    smootherstep(8,12,z)*
    (1-smootherstep(35,41,z))
  const corridor=
    (1-smootherstep(1.1,5.8,Math.abs(x-openingCenterX(z))))*
    corridorEnvelope
  const turnoutDistance=Math.hypot((x+2)/12,(z-34)/9)
  const turnout=1-smootherstep(.72,1.25,turnoutDistance)
  const weight=Math.max(corridor,turnout)
  return THREE.MathUtils.lerp(base,openingFloor(z),weight)
}

export const sampleMountainSlope=(x,z)=>{
  const d=.15
  return Math.hypot(
    sampleMountainHeight(x+d,z)-sampleMountainHeight(x-d,z),
    sampleMountainHeight(x,z+d)-sampleMountainHeight(x,z-d),
  )/(d*2)
}

export const createTerrainGeometry=({
  width=20,
  depth=30,
  segmentsX=10,
  segmentsZ=12,
  heightAt=sampleMountainHeight,
}={})=>{
  const geometry=new THREE.PlaneGeometry(width,depth,segmentsX,segmentsZ)
  geometry.rotateX(-Math.PI/2)

  const position=geometry.attributes.position
  const heights=new Float32Array(position.count)
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index)
    const z=position.getZ(index)
    const height=heightAt(x,z)
    heights[index]=height
    position.setY(index,height)
  }
  position.needsUpdate=true
  geometry.computeVertexNormals()

  const slopes=new Float32Array(position.count)
  const columns=segmentsX+1
  const xStep=width/segmentsX
  const zStep=depth/segmentsZ
  let maximumSlope=0
  for(let row=0;row<=segmentsZ;row+=1){
    for(let column=0;column<=segmentsX;column+=1){
      const index=row*columns+column
      const left=row*columns+Math.max(0,column-1)
      const right=row*columns+Math.min(segmentsX,column+1)
      const previous=Math.max(0,row-1)*columns+column
      const next=Math.min(segmentsZ,row+1)*columns+column
      const dx=heights[right]-heights[left]
      const dz=heights[next]-heights[previous]
      const horizontalX=(Math.min(segmentsX,column+1)-Math.max(0,column-1))*xStep
      const horizontalZ=(Math.min(segmentsZ,row+1)-Math.max(0,row-1))*zStep
      const slope=Math.hypot(dx/(horizontalX||1),dz/(horizontalZ||1))
      slopes[index]=slope
      maximumSlope=Math.max(maximumSlope,slope)
    }
  }
  if(maximumSlope>0){
    for(let index=0;index<slopes.length;index+=1) slopes[index]/=maximumSlope
  }
  geometry.setAttribute('slope',new THREE.BufferAttribute(slopes,1))

  return geometry
}

export const getBiomeWeights=progress=>{
  const waterIn=smootherstep(.22,.42,progress)
  const forestIn=smootherstep(.56,.76,progress)
  const raw={mountain:1-waterIn,water:waterIn*(1-forestIn),forest:forestIn}
  const total=raw.mountain+raw.water+raw.forest
  return Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,value/total]))
}
