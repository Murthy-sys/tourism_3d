import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { mesh } from './primitives'
import { createEnvironmentMaterial,createLandscapeMaterial,createFoliageGeometry,createFoliageMaterial,createLeafTexture,projectGroundUV } from './environmentSurface'
import {createTrailhead} from './trailhead'
import {createForestTreeGeometry} from './forestGeometry'
import {TRAILHEAD_STANDING_POSES} from './trekkingParty'
import {sampleRiverSurface,RIVER_START_Z,RIVER_END_Z} from './riverConfig'
import {
  LANDMARKS,
  createTerrainGeometry,
  sampleMountainHeight,
  sampleMountainSlope,
} from './terrain'

const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const material=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({
  color,
  roughness,
  ...extra,
})

const deterministic=(index,salt=0)=>{
  const value=Math.sin((index+1)*91.733+salt*37.119)*43758.5453
  return value-Math.floor(value)
}

const routeDistance=(x,z,points)=>points.reduce((distance,point)=>{
  return Math.min(distance,Math.hypot(x-point.x,z-point.z))
},Infinity)

const appendSegment=(points,from,to,count,heightAt,amplitude,frequency)=>{
  for(let index=1;index<count;index+=1){
    const t=index/(count-1)
    const x=THREE.MathUtils.lerp(from[0],to[0],t)+
      Math.sin(t*Math.PI)*Math.sin(t*Math.PI*frequency)*amplitude
    const z=THREE.MathUtils.lerp(from[2],to[2],t)
    const endpoint=index===count-1
    const y=endpoint?to[1]:heightAt(x,z)+.08
    points.push(new THREE.Vector3(x,y,z))
  }
}

const closestProgress=(route,landmark)=>{
  const target=new THREE.Vector3(...landmark)
  let closest=0
  let distance=Infinity
  for(let index=0;index<=4096;index+=1){
    const progress=index/4096
    const candidate=route.getPointAt(progress)
    const nextDistance=candidate.distanceToSquared(target)
    if(nextDistance<distance){
      closest=progress
      distance=nextDistance
    }
  }
  return closest
}

const createRoute=heightAt=>{
  const points=[new THREE.Vector3(...LANDMARKS.trailheadStart)]
  appendSegment(
    points,
    LANDMARKS.trailheadStart,
    LANDMARKS.mountainEntry,
    14,
    heightAt,
    .28,
    1.4,
  )
  appendSegment(
    points,
    LANDMARKS.mountainEntry,
    LANDMARKS.mountainStart,
    10,
    heightAt,
    .42,
    1.8,
  )
  appendSegment(
    points,
    LANDMARKS.mountainStart,
    LANDMARKS.mountainLanding,
    32,
    heightAt,
    1.45,
    3.4,
  )
  const route=new THREE.CatmullRomCurve3(points,false,'centripetal')
  return{
    route,
    routeProgress:{
      trailheadStart:0,
      mountainEntry:closestProgress(route,LANDMARKS.mountainEntry),
      mountainStart:closestProgress(route,LANDMARKS.mountainStart),
      mountainLanding:1,
    },
  }
}

const terrainGrass=new THREE.Color('#65724e')
const terrainSoil=new THREE.Color('#81745c')
const terrainRock=new THREE.Color('#7b7d74')
const terrainColorAt=(color,x,z,height)=>{
  const slope=sampleMountainSlope(x,z)
  const soilWeight=THREE.MathUtils.smoothstep(slope,.12,.5)
  const rockWeight=THREE.MathUtils.clamp(
    THREE.MathUtils.smoothstep(slope,.38,.86)+
    THREE.MathUtils.smoothstep(height,6.5,10)*.42,
    0,1,
  )
  color.copy(terrainGrass).lerp(terrainSoil,soilWeight).lerp(terrainRock,rockWeight)
  const detail=Math.sin(x*1.71+Math.sin(z*.63))*.52+
    Math.cos(z*1.19-x*.47)*.31+Math.sin((x+z)*3.27)*.17
  return color.offsetHSL(detail*.012,detail*.024,detail*.042)
}

const renderedTerrainHeight=(heightAt,x,z)=>{
  const height=heightAt(x,z)-THREE.MathUtils.smoothstep(-z,32.5,38)*1.45
  if(z>=RIVER_START_Z||z<RIVER_END_Z) return height
  const river=sampleRiverSurface(x,z)
  const shoreline=1-THREE.MathUtils.smoothstep(river.edgeDistance,2,7)
  // The landing itself retains its height; the incoming valley sinks immediately
  // behind it, underneath the single river-owned bed and shoreline surface.
  const entry=THREE.MathUtils.smoothstep(-z,-RIVER_START_Z,-RIVER_START_Z+1)
  return Math.min(height,THREE.MathUtils.lerp(height,river.bedHeight-.8,shoreline*entry))
}

const matchTerrainBoundaryNormals=(geometry,heightAt)=>{
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal')
  const slope=new THREE.Vector3(),step=.15
  for(let index=0;index<position.count;index++){
    const x=position.getX(index),z=position.getZ(index)
    if(Math.abs(x)!==42&&Math.abs(z)!==52) continue
    const dx=(renderedTerrainHeight(heightAt,x+step,z)-renderedTerrainHeight(heightAt,x-step,z))/(step*2)
    const dz=(renderedTerrainHeight(heightAt,x,z+step)-renderedTerrainHeight(heightAt,x,z-step))/(step*2)
    slope.set(-dx,1,-dz).normalize()
    normal.setXYZ(index,slope.x,slope.y,slope.z)
  }
}

const createTerrain=(heightAt,quality)=>{
  const segmentsX=quality==='mobile'?72:128
  const segmentsZ=quality==='mobile'?104:160
  const geometry=createTerrainGeometry({
    width:84,
    depth:104,
    segmentsX,
    segmentsZ,
    heightAt,
  })
  const position=geometry.attributes.position
  const colors=new Float32Array(position.count*3)
  const color=new THREE.Color()
  let minimumColorSum=Infinity
  let maximumColorSum=-Infinity
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index)
    const z=position.getZ(index)
    const height=renderedTerrainHeight(heightAt,x,z)
    position.setY(index,height)
    terrainColorAt(color,x,z,height)
    const colorSum=color.r+color.g+color.b
    minimumColorSum=Math.min(minimumColorSum,colorSum)
    maximumColorSum=Math.max(maximumColorSum,colorSum)
    colors[index*3]=color.r
    colors[index*3+1]=color.g
    colors[index*3+2]=color.b
  }
  position.needsUpdate=true
  geometry.computeVertexNormals()
  matchTerrainBoundaryNormals(geometry,heightAt)
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
  geometry.userData.colorVariation=maximumColorSum-minimumColorSum
  projectGroundUV(geometry,3.2)
  const terrainMaterial=createLandscapeMaterial({
    vertexColors:true,
    roughness:.9,
    metalness:0,
    dithering:true,
  })
  const terrain=mesh(geometry,terrainMaterial)
  terrain.name='hill-terrain'
  return terrain
}

const createTerrainSurround=(terrain,heightAt)=>{
  const {widthSegments, heightSegments}=terrain.geometry.parameters
  const core=terrain.geometry.getAttribute('position')
  const coreX=Array.from({length:widthSegments+1},(_,index)=>core.getX(index))
  const coreZ=Array.from({length:heightSegments+1},(_,index)=>core.getZ(index*(widthSegments+1)))
  const right=[42,42+84/widthSegments,44,48,56,72,100,150,220,320]
  const left=right.map(value=>-value).reverse()
  const across=[...left.slice(0,-1),...coreX,...right.slice(1)]
  const front=[52,52+104/heightSegments,54,58,66,78,96,122,160,220,320]
  const back=[-320,-220,-160,-116,-92,-88,...Array.from({length:18},(_,index)=>-86+index*2)]
  const positions=[],colors=[],indices=[],color=new THREE.Color()
  const append=(xs,zs)=>{
    const base=positions.length/3
    for(const z of zs){
      for(const x of xs){
        const height=renderedTerrainHeight(heightAt,x,z)
        positions.push(x,height,z)
        terrainColorAt(color,x,z,height)
        colors.push(color.r,color.g,color.b)
      }
    }
    for(let row=0;row<zs.length-1;row+=1){
      for(let column=0;column<xs.length-1;column+=1){
        const offset=base+row*xs.length+column,next=offset+xs.length
        indices.push(offset,next,offset+1,offset+1,next,next+1)
      }
    }
  }
  append(across,front)
  append(across,back)
  append(left,coreZ)
  append(right,coreZ)
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  matchTerrainBoundaryNormals(geometry,heightAt)
  projectGroundUV(geometry,3.2)
  geometry.userData.continuousSurround=true
  const surround=mesh(geometry,terrain.material)
  surround.name='hill-terrain-surround'
  surround.castShadow=false
  return surround
}

const createRidgeGeometry=layer=>{
  const columns=56
  const rows=16
  const depth=20
  const centerZ=-49-layer*15
  const geometry=new THREE.PlaneGeometry(94,depth,columns,rows)
  geometry.rotateX(-Math.PI/2)
  const position=geometry.getAttribute('position')
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index)
    const localZ=position.getZ(index)
    const opening=THREE.MathUtils.smoothstep(
      Math.abs(x),
      5+layer*1.4,
      21+layer*2.2,
    )
    const longitudinal=.35+.65*Math.sin((localZ/depth+.5)*Math.PI)
    const undulation=
      Math.sin(x*.17+layer*1.9)*1.05+
      Math.sin(x*.055-layer*.8)*1.2+
      Math.cos(localZ*.28+x*.035)*.48
    const gullies=Math.abs(Math.sin(x*.37+Math.sin(localZ*.22)*1.3))*1.15
    const height=(-.55+layer*.28)+
      opening*longitudinal*(5.5-layer*.35+undulation-gullies)
    const z=centerZ+localZ+Math.sin(x*.09+layer)*.35
    const river=sampleRiverSurface(x,z)
    const bankFoot=THREE.MathUtils.smoothstep(river.edgeDistance,3,13)
    position.setXYZ(
      index,
      x,
      THREE.MathUtils.lerp(Math.min(-1.45,river.bedHeight-.45),height,bankFoot),
      z,
    )
  }
  const source=geometry.getIndex(),indices=[]
  for(let offset=0;offset<source.count;offset+=3){
    const triangle=[source.getX(offset),source.getX(offset+1),source.getX(offset+2)]
    if(triangle.every(vertex=>sampleRiverSurface(position.getX(vertex),position.getZ(vertex)).edgeDistance>=3)) indices.push(...triangle)
  }
  geometry.setIndex(indices)
  const clipped=mergeVertices(geometry)
  geometry.dispose()
  clipped.userData.surfaceKind='horizontal-heightfield'
  clipped.computeVertexNormals()
  return projectGroundUV(clipped,5)
}

const createRidges=()=>{
  const ridges=namedGroup('hill-ridges')
  const colors=['#657066','#7c857b','#939c93']
  colors.forEach((color,index)=>{
    const ridge=mesh(
      createRidgeGeometry(index),
      createEnvironmentMaterial(color,'rock'),
    )
    ridge.name=`hill-ridge-${index+1}`
    ridge.renderOrder=-3+index
    ridges.add(ridge)
  })
  return ridges
}

const createTree=(materials,index,scale)=>{
  const tree=new THREE.Group()
  tree.name='hill-tree'
  const geometry=materials.treeGeometries[Math.floor(index/6)%materials.treeGeometries.length]
  const trunk=mesh(
    geometry.skeleton,
    materials.wood,
  )
  tree.add(trunk)
  const crown=mesh(
    geometry.crown,
    index%2?materials.foliage:materials.foliageAlt,
  )
  crown.name='hill-leaf-crown'
  tree.add(crown)
  tree.scale.setScalar(scale*.28)
  tree.rotation.y=deterministic(index,11)*Math.PI*2
  return tree
}

const createBush=(materials,index,scale)=>{
  const bush=new THREE.Group()
  bush.name='hill-bush'
  ;[-1,0,1].forEach((offset,part)=>{
    const leaf=mesh(
      createFoliageGeometry({seed:index*3+part,variant:1,scale:(.23+part*.025)*scale,leaves:36}),
      part===1?materials.foliageAlt:materials.foliage,
      [offset*.25*scale,.28*scale,Math.sin(index+part)*.12*scale],
    )
    leaf.scale.y=.78
    bush.add(leaf)
  })
  return bush
}

const createGrassCluster=(materials,index,scale)=>{
  const cluster=new THREE.Group()
  cluster.name='hill-grass-cluster'
  for(let blade=0;blade<5;blade+=1){
    const angle=(blade/5)*Math.PI*2+deterministic(index,blade)
    const grass=mesh(
      new THREE.ConeGeometry(.035*scale,.48*scale,5),
      blade%2?materials.leaf2:materials.leaf,
      [Math.cos(angle)*.13*scale,.24*scale,Math.sin(angle)*.13*scale],
      [Math.sin(angle)*.16,0,Math.cos(angle)*.16],
    )
    cluster.add(grass)
  }
  return cluster
}

const landscapePosition=(index,salt,heightAt,routePoints)=>{
  for(let attempt=0;attempt<8;attempt+=1){
    const key=index+attempt*101
    const x=THREE.MathUtils.lerp(-33,33,deterministic(key,salt))
    const z=THREE.MathUtils.lerp(-35,18,deterministic(key,salt+1))
    if(routeDistance(x,z,routePoints)>1.3){
      return new THREE.Vector3(x,heightAt(x,z),z)
    }
  }
  const side=index%2?-1:1
  const z=THREE.MathUtils.lerp(-35,18,deterministic(index,salt+3))
  const x=side*(5+deterministic(index,salt+4)*24)
  return new THREE.Vector3(x,heightAt(x,z),z)
}

const createRockFaces=(materials,heightAt,routePoints,quality)=>{
  const rocks=namedGroup('hill-rock-faces')
  const count=quality==='mobile'?14:28
  for(let index=0;index<count;index+=1){
    const position=landscapePosition(index,21,heightAt,routePoints)
    const size=.25+deterministic(index,24)*.55
    const rock=mesh(
      new THREE.DodecahedronGeometry(size,1),
      materials.stone,
      position.toArray(),
      [deterministic(index,26)*.7,deterministic(index,27)*Math.PI,deterministic(index,28)*.45],
    )
    rock.name='rock-outcrop'
    rock.scale.set(
      .9+.45*deterministic(index,29),
      .45+.3*deterministic(index,30),
      .75+.45*deterministic(index,31),
    )
    rocks.add(rock)
  }
  return rocks
}

const createVegetation=(materials,heightAt,routePoints,quality)=>{
  const vegetation=namedGroup('hill-vegetation')
  const count=quality==='mobile'?34:76
  for(let index=0;index<count;index+=1){
    const position=landscapePosition(index,43,heightAt,routePoints)
    const scale=.65+deterministic(index,47)*.72
    const kind=index%6
    const object=kind<2
      ?createTree(materials,index,scale)
      :kind<4
        ?createBush(materials,index,scale)
        :createGrassCluster(materials,index,scale)
    object.position.copy(position)
    vegetation.add(object)
  }
  return vegetation
}

const createRibbonGeometry=(points,width)=>{
  const positions=[]
  const indices=[]
  points.forEach((point,index)=>{
    const previous=points[Math.max(0,index-1)]
    const next=points[Math.min(points.length-1,index+1)]
    const tangent=new THREE.Vector2(next.x-previous.x,next.z-previous.z).normalize()
    const side=new THREE.Vector2(-tangent.y,tangent.x).multiplyScalar(width*.5)
    positions.push(
      point.x+side.x,point.y+.012,point.z+side.y,
      point.x-side.x,point.y+.012,point.z-side.y,
    )
    if(index<points.length-1){
      const current=index*2
      indices.push(current,current+2,current+1,current+1,current+2,current+3)
    }
  })
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return projectGroundUV(geometry,1.6)
}

const createTrail=(materials,route,heightAt,quality)=>{
  const trail=namedGroup('hill-trail')
  const surface=mesh(
    createRibbonGeometry(route.points,1.05),
    createEnvironmentMaterial('#87765c','soil'),
  )
  surface.name='hill-trail-earth'
  trail.add(surface)

  const wetStones=namedGroup('hill-wet-stones')
  const stoneCount=quality==='mobile'?7:13
  for(let index=0;index<stoneCount;index+=1){
    const t=.72+index/(stoneCount-1)*.24
    const point=route.getPoint(t)
    const tangent=route.getTangent(t)
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize()
    const offset=(index%2?-.38:.38)*(1+deterministic(index,61)*.35)
    const x=point.x+side.x*offset
    const z=point.z+side.z*offset
    const stone=mesh(
      new THREE.DodecahedronGeometry(.18+deterministic(index,62)*.15,0),
      materials.stone,
      [x,heightAt(x,z)+.09,z],
      [0,deterministic(index,63)*Math.PI,0],
    )
    stone.scale.y=.38
    wetStones.add(stone)
  }
  trail.add(wetStones)

  const reeds=namedGroup('hill-landing-reeds')
  for(let index=0;index<(quality==='mobile'?10:22);index+=1){
    const side=index%2?-1:1
    const x=LANDMARKS.mountainLanding[0]+side*(1.1+deterministic(index,70)*2.1)
    const z=LANDMARKS.mountainLanding[2]-1.2+deterministic(index,71)*3.8
    const height=.45+deterministic(index,72)*.65
    reeds.add(mesh(
      new THREE.CylinderGeometry(.014,.025,height,5),
      index%3?materials.leaf2:materials.leaf,
      [x,heightAt(x,z)+height*.5,z],
      [Math.sin(index)*.07,0,Math.cos(index)*.07],
    ))
  }
  trail.add(reeds)
  return trail
}

const createLanding=materials=>{
  const landing=namedGroup('mountain-water-landing')
  landing.position.set(...LANDMARKS.mountainLanding)
  const deck=namedGroup('mountain-landing-deck')
  deck.position.y=.18
  for(let index=-2;index<=2;index+=1){
    const plank=mesh(
      new THREE.BoxGeometry(.7,.16,3.2),
      index%2?materials.wood:material('#5a3d2c',.96),
      [index*.72,0,0],
    )
    plank.rotation.y=(deterministic(index,81)-.5)*.025
    plank.name='landing-plank'
    deck.add(plank)
  }
  ;[-1.65,1.65].forEach(side=>{
    ;[-1.35,1.35].forEach(depth=>{
      deck.add(mesh(
        new THREE.CylinderGeometry(.055,.075,1.25,8),
        materials.wood,
        [side,-.35,depth],
      ))
    })
  })
  landing.add(deck)
  return landing
}

const createMist=(quality)=>{
  const mist=namedGroup('hill-mist')
  const count=quality==='mobile'?4:7
  for(let index=0;index<count;index+=1){
    const opacity=.018+index%3*.003
    const mistMaterial=new THREE.MeshBasicMaterial({
      color:index%2?'#d5ddd5':'#c6d4ca',
      transparent:true,
      opacity,
      depthWrite:false,
      side:THREE.DoubleSide,
    })
    const plane=mesh(
      new THREE.PlaneGeometry(10+index%3,2.1+index%2*.5),
      mistMaterial,
      [(index%3-1)*9,1.6+index%2*.8,-8-index*5.3],
      [0,(index%2-.5)*.12,0],
    )
    plane.name='hill-mist-pocket'
    plane.userData.baseX=plane.position.x
    plane.userData.baseOpacity=opacity
    mist.add(plane)
  }
  return mist
}

export function createHillWorld(materials,quality='desktop'){
  const world=namedGroup('hill-world')
  const leafMap=createLeafTexture()
  materials={
    ...materials,
    treeGeometries:Array.from({length:6},(_,index)=>createForestTreeGeometry(index,quality)),
    wood:createEnvironmentMaterial('#655244','bark'),
    stone:createEnvironmentMaterial('#838177','rock'),
    leaf:material('#556649',.98),
    leaf2:material('#77805c',.98),
    foliage:createFoliageMaterial('#546747',leafMap),
    foliageAlt:createFoliageMaterial('#74805a',leafMap),
  }
  const heightAt=sampleMountainHeight
  const {route,routeProgress}=createRoute(heightAt)
  const terrain=createTerrain(heightAt,quality)
  const terrainSurround=createTerrainSurround(terrain,heightAt)
  const ridges=createRidges()
  const rocks=createRockFaces(materials,heightAt,route.points,quality)
  const vegetation=createVegetation(materials,heightAt,route.points,quality)
  const mist=createMist(quality)
  const trail=createTrail(materials,route,heightAt,quality)
  const trailhead=createTrailhead(materials,{
    quality,
    heightAt,
    route,
    standingPoses:TRAILHEAD_STANDING_POSES,
    terrainGeometry:terrain.geometry,
    terrainSurroundGeometry:terrainSurround.geometry,
  })
  const gravel=trailhead.getObjectByName('trailhead-gravel-surface')
  gravel.material.dispose()
  gravel.material=createEnvironmentMaterial('#8b8170','rock',{bumpScale:.035})
  projectGroundUV(gravel.geometry,1.8)
  trailhead.traverse(object=>{
    if(object.name!=='trailhead-framing-bush') return
    const radius=object.geometry.parameters.radius
    object.geometry.dispose()
    object.geometry=createFoliageGeometry({seed:Math.round(object.position.x*31),variant:1,scale:radius*.55,leaves:64})
    object.material=materials.foliage
  })
  const landing=createLanding(materials)
  world.add(terrain,terrainSurround,ridges,rocks,vegetation,mist,trail,trailhead,landing)

  const warmLight=new THREE.DirectionalLight('#e6dcc6',.7)
  warmLight.position.set(-16,24,13)
  world.add(warmLight)

  world.userData={
    route,
    routeProgress,
    heightAt,
    trailhead,
    landing,
    distantWaterAnchor:new THREE.Vector3(2,.4,-51),
    mist,
  }
  return world
}

export function updateHillWorld(world,elapsed){
  const {mist}=world.userData
  if(mist){
    mist.children.forEach((pocket,index)=>{
      pocket.position.x=pocket.userData.baseX+Math.sin(elapsed*.12+index*1.47)*.48
      const opacity=pocket.userData.baseOpacity*(.88+Math.sin(elapsed*.2+index)*.12)
      pocket.material.opacity=opacity
    })
  }
}
