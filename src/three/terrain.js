import * as THREE from 'three'

export const smoothstep=(a,b,v)=>{
  const t=THREE.MathUtils.clamp((v-a)/(b-a||1),0,1)
  return t*t*(3-2*t)
}

const wave=(x,z)=>Math.sin(x*.19+Math.sin(z*.11))*1.8+Math.cos(z*.12-x*.07)*1.25+Math.sin((x+z)*.31)*.42

export const sampleHillHeight=(x,z)=>Math.max(0,(wave(x,z)+3.2)*smoothstep(8,-28,z))

export const sampleHillSlope=(x,z)=>Math.hypot(
  sampleHillHeight(x+.15,z)-sampleHillHeight(x-.15,z),
  sampleHillHeight(x,z+.15)-sampleHillHeight(x,z-.15),
)/.3

export const createTerrainGeometry=({width,depth,segmentsX,segmentsZ,heightAt})=>{
  const geometry=new THREE.PlaneGeometry(width,depth,segmentsX,segmentsZ)
  geometry.rotateX(-Math.PI/2)
  const positions=geometry.attributes.position
  const slopes=new Float32Array(positions.count)
  let maxSlope=0

  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),height=heightAt(x,z)
    positions.setY(i,height)
    const slope=sampleHillSlope(x,z)
    slopes[i]=slope
    maxSlope=Math.max(maxSlope,slope)
  }

  for(let i=0;i<slopes.length;i++)slopes[i]/=maxSlope||1
  positions.needsUpdate=true
  geometry.setAttribute('slope',new THREE.BufferAttribute(slopes,1))
  geometry.computeVertexNormals()
  return geometry
}

export const getLandscapeWeights=p=>{
  const waterIn=smoothstep(.54,.62,p),hillIn=smoothstep(.69,.77,p)
  const forest=1-waterIn,water=waterIn*(1-hillIn),hills=hillIn
  const total=forest+water+hills
  return{forest:forest/total,water:water/total,hills:hills/total}
}
