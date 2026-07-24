import * as THREE from 'three'
import {mesh} from './primitives'

const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const hash=(index,salt=0)=>{
  const value=Math.sin((index+1)*91.733+salt*37.119)*43758.5453
  return value-Math.floor(value)
}

const minimumRouteDistance=(point,route)=>
  route.getSpacedPoints(100).reduce(
    (distance,candidate)=>Math.min(distance,point.distanceTo(candidate)),
    Infinity,
  )

const createTurnoutGeometry=(heightAt,quality)=>{
  const segments=quality==='mobile'?36:72
  const rings=quality==='mobile'?7:8
  const positions=[-2,heightAt(-2,34)+.015,34]
  const indices=[]
  for(let ring=1;ring<=rings;ring+=1){
    for(let index=0;index<segments;index+=1){
      const angle=index/segments*Math.PI*2
      const radius=ring/rings*(1+(hash(index,2)-.5)*.12)
      const x=-2+Math.cos(angle)*12*radius
      const z=34+Math.sin(angle)*8.5*radius
      positions.push(x,heightAt(x,z)+.018,z)
    }
  }
  for(let index=0;index<segments;index+=1){
    indices.push(0,(index+1)%segments+1,index+1)
  }
  for(let ring=2;ring<=rings;ring+=1){
    const innerStart=1+(ring-2)*segments
    const outerStart=innerStart+segments
    for(let index=0;index<segments;index+=1){
      const next=(index+1)%segments
      indices.push(
        innerStart+index,outerStart+next,outerStart+index,
        innerStart+index,innerStart+next,outerStart+next,
      )
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const makePatch=(name,radius,color,roughness,x,z,heightAt)=>{
  const patch=mesh(
    new THREE.CircleGeometry(radius,24),
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness:0,
      transparent:true,
      opacity:.72,
      depthWrite:false,
    }),
    [x,heightAt(x,z)+.035,z],
    [-Math.PI/2,0,0],
  )
  patch.name=name
  patch.scale.y=.62
  patch.castShadow=false
  return patch
}

export function createTrailhead(materials,{
  quality='desktop',
  heightAt,
  route,
  standingPoses=[],
}){
  const trailhead=namedGroup('trailhead')
  const gravel=namedGroup('trailhead-gravel')
  const turnout=mesh(
    createTurnoutGeometry(heightAt,quality),
    new THREE.MeshStandardMaterial({
      color:'#756d5f',
      roughness:1,
      metalness:0,
    }),
  )
  turnout.castShadow=false
  gravel.add(turnout)
  const earth=namedGroup('trailhead-earth')
  earth.add(
    makePatch('trailhead-earth-patch-1',4.1,'#665443',1,-5.1,35.4,heightAt),
    makePatch('trailhead-earth-patch-2',3.2,'#6c5844',1,2.6,31.8,heightAt),
  )

  const tireMarks=namedGroup('trailhead-tire-marks')
  ;[-.72,.72].forEach((offset,index)=>{
    const track=mesh(
      new THREE.BoxGeometry(.12,.018,9.2),
      new THREE.MeshStandardMaterial({color:'#403c35',roughness:1}),
      [-4+offset,heightAt(-4+offset,34)+.045,34],
      [0,-Math.PI/2,0],
    )
    track.name=`trailhead-tire-mark-${index+1}`
    track.castShadow=false
    tireMarks.add(track)
  })

  const damp=namedGroup('trailhead-damp-patches')
  damp.add(
    makePatch('trailhead-damp-patch-1',1.15,'#394944',.38,-8.1,31.1,heightAt),
    makePatch('trailhead-damp-patch-2',.82,'#344641',.34,.2,39.1,heightAt),
  )

  const grass=namedGroup('trailhead-edge-grass')
  const stones=namedGroup('trailhead-edge-stones')
  const bushes=namedGroup('trailhead-framing-bushes')
  const routeObstacles=[]
  const count=quality==='mobile'?28:56
  const turnoutBounds=new THREE.Box3(
    new THREE.Vector3(-10.5,-.1,29),
    new THREE.Vector3(4.5,4.2,40.2),
  )
  const standingPoints=standingPoses.map(pose=>new THREE.Vector3(...pose.position))

  for(let index=0;index<count;index+=1){
    const angle=index/count*Math.PI*2+(hash(index,9)-.5)*.12
    const radiusX=13.2+hash(index,10)*3.4
    const radiusZ=9.4+hash(index,11)*2.8
    const x=-2+Math.cos(angle)*radiusX
    const z=34+Math.sin(angle)*radiusZ
    const point=new THREE.Vector3(x,heightAt(x,z),z)
    if(minimumRouteDistance(point,route)<2.4) continue
    if(standingPoints.some(candidate=>candidate.distanceTo(point)<1.6)) continue

    const kind=index%3
    let object
    if(kind===0){
      object=mesh(
        new THREE.DodecahedronGeometry(.16+hash(index,12)*.24,0),
        materials.stone,
        point.toArray(),
        [hash(index,13),hash(index,14)*Math.PI,0],
      )
      object.name='trailhead-edge-stone'
      object.scale.y=.45
      stones.add(object)
    }else if(kind===1){
      object=mesh(
        new THREE.ConeGeometry(.06,.42+hash(index,15)*.28,5),
        index%2?materials.leaf:materials.leaf2,
        [x,point.y+.24,z],
      )
      object.name='trailhead-edge-grass-clump'
      grass.add(object)
    }else{
      object=mesh(
        new THREE.IcosahedronGeometry(.38+hash(index,16)*.32,1),
        index%2?materials.leaf2:materials.leaf,
        [x,point.y+.34,z],
      )
      object.name='trailhead-framing-bush'
      object.scale.set(1.2,.72,.9)
      bushes.add(object)
    }
    object.updateMatrixWorld(true)
    routeObstacles.push(new THREE.Box3().setFromObject(object))
  }

  trailhead.add(gravel,earth,tireMarks,damp,grass,stones,bushes)
  trailhead.userData={
    coachPose:{
      position:new THREE.Vector3(-4,heightAt(-4,34),34),
      heading:-Math.PI/2,
    },
    turnoutBounds,
    routeObstacles,
    routeClearance:1.5,
    cameraClearance:3,
  }
  return trailhead
}
