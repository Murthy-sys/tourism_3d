import * as THREE from 'three'
import {mesh} from './primitives'
import {createTerrainGeometry,sampleHillHeight,sampleHillSlope} from './terrain'

const HEIGHT_SCALE=3.2
const TERRAIN_COLORS={grass:'#496b35',earth:'#66513a',rock:'#59605b'}
const named=name=>{const group=new THREE.Group();group.name=name;return group}
const deterministic=index=>{
  const value=Math.sin(index*91.731+17.137)*43758.5453
  return value-Math.floor(value)
}
const heightAt=(x,z)=>sampleHillHeight(x,z)*HEIGHT_SCALE
const visualSlopeAt=(x,z)=>sampleHillSlope(x,z)*HEIGHT_SCALE

const addSlopeColors=(geometry,slopeAt=visualSlopeAt)=>{
  const position=geometry.attributes.position
  const colors=new Float32Array(position.count*3)
  const grass=new THREE.Color(TERRAIN_COLORS.grass)
  const earth=new THREE.Color(TERRAIN_COLORS.earth)
  const rock=new THREE.Color(TERRAIN_COLORS.rock)
  for(let i=0;i<position.count;i++){
    const slope=slopeAt(position.getX(i),position.getZ(i))
    const color=slope<.8?grass:slope<1.45?earth:rock
    color.toArray(colors,i*3)
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
  return geometry
}

const createTerrain=(quality)=>{
  const mobile=quality==='mobile'
  const geometry=createTerrainGeometry({
    width:64,
    depth:72,
    segmentsX:mobile?56:96,
    segmentsZ:mobile?72:108,
    heightAt,
  })
  addSlopeColors(geometry)
  const material=new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:.92,
    metalness:0,
    flatShading:false,
  })
  const terrain=mesh(geometry,material)
  terrain.name='hill-terrain'
  return terrain
}

const createRidges=(quality)=>{
  const ridges=named('hill-ridges')
  const mobile=quality==='mobile'
  const layers=[
    {z:-38,color:'#4c6250',opacity:.86,scale:1.75,offset:0},
    {z:-50,color:'#5e6b60',opacity:.64,scale:1.42,offset:9},
    {z:-62,color:'#707970',opacity:.43,scale:1.12,offset:18},
  ]
  layers.forEach((layer,index)=>{
    const ridgeHeight=(x,z)=>2+index*1.15+sampleHillHeight(x+layer.offset,z-25-index*3)*layer.scale
    const geometry=createTerrainGeometry({
      width:76,
      depth:18,
      segmentsX:mobile?40:64,
      segmentsZ:mobile?12:20,
      heightAt:ridgeHeight,
    })
    const material=new THREE.MeshStandardMaterial({
      color:layer.color,
      roughness:.96,
      transparent:true,
      opacity:layer.opacity,
      depthWrite:index===0,
    })
    const ridge=mesh(geometry,material,[0,0,layer.z])
    ridge.name=`hill-ridge-${index+1}`
    ridges.add(ridge)
  })
  return ridges
}

const broadleafTree=(materials,index)=>{
  const tree=new THREE.Group()
  const trunkHeight=.85+deterministic(index+3)*.5
  tree.add(mesh(new THREE.CylinderGeometry(.09,.14,trunkHeight,7),materials.wood,[0,trunkHeight/2,0]))
  const crown=mesh(new THREE.IcosahedronGeometry(.58,1),index%3===0?materials.leaf2:materials.leaf,[0,trunkHeight+.35,0])
  crown.scale.set(1.15,.82,1)
  tree.add(crown)
  tree.name='hill-broadleaf'
  return tree
}

const pineTree=(materials,index)=>{
  const tree=new THREE.Group()
  const trunkHeight=1.2+deterministic(index+7)*.45
  tree.add(mesh(new THREE.CylinderGeometry(.055,.11,trunkHeight,7),materials.wood,[0,trunkHeight/2,0]))
  for(let tier=0;tier<3;tier++){
    const crown=mesh(new THREE.IcosahedronGeometry(.48-tier*.08,1),tier===1?materials.leaf2:materials.leaf,[0,.72+tier*.34,0])
    crown.scale.set(1,.72,1)
    tree.add(crown)
  }
  tree.name='hill-pine'
  return tree
}

const createForest=(materials,quality)=>{
  const forest=named('hill-forest')
  const clusterCount=quality==='mobile'?10:15
  for(let cluster=0;cluster<clusterCount;cluster++){
    const centerX=-28+deterministic(cluster*13+1)*56
    const centerZ=-29+deterministic(cluster*17+2)*40
    for(let member=0;member<6;member++){
      const index=cluster*6+member
      const angle=deterministic(index*5+4)*Math.PI*2
      const radius=.6+deterministic(index*7+5)*3.8
      const x=centerX+Math.cos(angle)*radius
      const z=centerZ+Math.sin(angle)*radius
      const slope=visualSlopeAt(x,z)
      if(slope>=1.1)continue
      const tree=index%4===0?pineTree(materials,index):broadleafTree(materials,index)
      tree.position.set(x,heightAt(x,z),z)
      tree.rotation.y=deterministic(index*11+8)*Math.PI*2
      tree.scale.setScalar(.72+deterministic(index*19+9)*.7)
      tree.userData.slope=slope
      forest.add(tree)
    }
  }
  return forest
}

const createRockFaces=(materials,quality)=>{
  const rocks=named('hill-rock-faces')
  const limit=quality==='mobile'?18:34
  let index=0
  for(let z=-30;z<=10&&rocks.children.length<limit;z+=1.8){
    for(let x=-29;x<=29&&rocks.children.length<limit;x+=1.8){
      const slope=visualSlopeAt(x,z)
      if(slope<1.1||deterministic(index++)<.72)continue
      const rock=mesh(new THREE.DodecahedronGeometry(.46+deterministic(index+2)*.52,0),materials.stone,[x,heightAt(x,z)+.18,z])
      rock.name='hill-rock-outcrop'
      rock.rotation.set(deterministic(index+4)*.5,deterministic(index+5)*Math.PI,deterministic(index+6)*.35)
      rock.scale.set(1+.8*deterministic(index+7),.45+.5*deterministic(index+8),.7+.5*deterministic(index+9))
      rock.userData.slope=slope
      rocks.add(rock)
    }
  }
  return rocks
}

class TerrainRoute extends THREE.CatmullRomCurve3{
  constructor(points,heightSampler){
    super(points,false,'centripetal')
    this.heightSampler=heightSampler
  }
  getPoint(t,target=new THREE.Vector3()){
    super.getPoint(t,target)
    target.y=this.heightSampler(target.x,target.z)+.08
    return target
  }
}

const createRoute=()=>{
  const points=[]
  for(let i=0;i<30;i++){
    const t=i/29
    const z=16-46*t
    const x=-7+12*t+Math.sin(t*Math.PI*4)*1.7
    points.push(new THREE.Vector3(x,heightAt(x,z)+.08,z))
  }
  return new TerrainRoute(points,heightAt)
}

const createTrailGeometry=(route)=>{
  const samples=120
  const width=.3
  const positions=new Float32Array((samples+1)*2*3)
  const uvs=new Float32Array((samples+1)*2*2)
  const indices=[]
  for(let i=0;i<=samples;i++){
    const t=i/samples
    const point=route.getPoint(t)
    const previous=route.getPoint(Math.max(0,t-1/samples))
    const next=route.getPoint(Math.min(1,t+1/samples))
    const dx=next.x-previous.x,dz=next.z-previous.z
    const length=Math.hypot(dx,dz)||1
    const sideX=-dz/length*width,sideZ=dx/length*width
    for(let side=0;side<2;side++){
      const direction=side===0?-1:1
      const x=point.x+sideX*direction,z=point.z+sideZ*direction
      const vertex=i*2+side
      positions[vertex*3]=x
      positions[vertex*3+1]=heightAt(x,z)+.11
      positions[vertex*3+2]=z
      uvs[vertex*2]=side
      uvs[vertex*2+1]=t
    }
    if(i<samples){
      const a=i*2,b=a+1,c=a+2,d=a+3
      indices.push(a,c,b,b,c,d)
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const createTrail=(route)=>{
  const trail=named('hill-trail')
  trail.add(mesh(createTrailGeometry(route),new THREE.MeshStandardMaterial({color:'#76553b',roughness:1})))
  return trail
}

const createLanding=(materials,start)=>{
  const landing=named('hill-landing')
  landing.position.set(start.x,heightAt(start.x,start.z),start.z)
  landing.add(mesh(new THREE.BoxGeometry(4.5,.35,2.8),materials.stone,[0,.18,0]))
  for(let x=-1.7;x<=1.7;x+=.68)landing.add(mesh(new THREE.BoxGeometry(.5,.16,3.15),materials.wood,[x,.43,0]))
  ;[-1.9,1.9].forEach(x=>[-1.15,1.15].forEach(z=>landing.add(mesh(new THREE.CylinderGeometry(.09,.12,1.2,8),materials.wood,[x,-.2,z]))))
  return landing
}

const createLodge=(materials,end)=>{
  const lodge=named('hill-lodge')
  lodge.position.set(end.x,heightAt(end.x,end.z),end.z)
  lodge.add(mesh(new THREE.BoxGeometry(5.3,.55,4),materials.stone,[0,.28,0]))
  lodge.add(mesh(new THREE.BoxGeometry(4.7,2.4,3.55),materials.wood,[0,1.72,0]))
  lodge.add(mesh(new THREE.BoxGeometry(2.75,.2,4.15),materials.dark,[-1.05,3.15,0],[0,0,-.48]))
  lodge.add(mesh(new THREE.BoxGeometry(2.75,.2,4.15),materials.dark,[1.05,3.15,0],[0,0,.48]))
  lodge.add(mesh(new THREE.BoxGeometry(.85,1.75,.12),materials.dark,[0,1.45,1.84]))
  ;[-1.45,1.45].forEach(x=>lodge.add(mesh(new THREE.BoxGeometry(.9,.78,.12),materials.ivory,[x,1.9,1.84])))
  return lodge
}

const createMist=()=>{
  const mist=named('hill-mist')
  const material=new THREE.MeshStandardMaterial({
    color:'#d9e3dc',
    transparent:true,
    opacity:.16,
    roughness:1,
    depthWrite:false,
  })
  const valleys=[[-2,-24],[24,-28],[28,-14],[-8,-16],[6,-14],[22,-6],[-2,-6],[-10,0]]
  valleys.forEach(([x,z],index)=>{
    const volume=mesh(new THREE.SphereGeometry(1,16,8),material,[x,heightAt(x,z)+.85,z])
    volume.name='hill-mist-volume'
    volume.scale.set(4.5+deterministic(index+40)*3,.35+.15*deterministic(index+50),1.7+deterministic(index+60)*1.5)
    volume.userData={baseX:x,phase:.4+index*.71,rate:.018+(index%3)*.004,amplitude:.75+(index%4)*.22}
    mist.add(volume)
  })
  return mist
}

export function createHillWorld(materials,quality='desktop'){
  const world=named('hill-world')
  const route=createRoute()
  const start=route.points[0]
  const end=route.points.at(-1)
  const mist=createMist()
  const landing=createLanding(materials,start)
  const lodge=createLodge(materials,end)
  world.add(
    createTerrain(quality),
    createRidges(quality),
    createForest(materials,quality),
    createRockFaces(materials,quality),
    mist,
    createTrail(route),
    landing,
    lodge,
  )
  world.userData={
    route,
    heightAt,
    mist,
    landing,
    copyAnchor:new THREE.Vector3(end.x,end.y+4.8,end.z),
  }
  return world
}

export function updateHillWorld(world,elapsed){
  const mist=world.userData.mist
  if(!mist)return
  mist.children.forEach(volume=>{
    const {baseX,phase,rate,amplitude}=volume.userData
    volume.position.x=baseX+Math.sin(elapsed*rate+phase)*amplitude
  })
}
