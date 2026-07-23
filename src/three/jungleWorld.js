import * as THREE from 'three'
import { mesh } from './primitives'
import { LANDMARKS } from './terrain'

const ROUTE_CLEARANCE=1.4
const nameGroup=name=>{const group=new THREE.Group();group.name=name;return group}
const cloneMaterialPalette=materials=>Object.fromEntries(
  Object.entries(materials).map(([name,material])=>[name,material.clone()]),
)
const hashed=(index,salt=0)=>{
  const value=Math.sin((index+1)*127.1+(salt+1)*311.7)*43758.5453123
  return value-Math.floor(value)
}

const distanceToRoute=(route,x,z)=>{
  let closest=Infinity
  for(let index=0;index<=1200;index+=1){
    const point=route.getPointAt(index/1200)
    closest=Math.min(closest,Math.hypot(x-point.x,z-point.z))
  }
  return closest
}

const obstacleFootprint=object=>{
  const bounds=new THREE.Box3().setFromObject(object)
  const center=bounds.getCenter(new THREE.Vector3())
  const size=bounds.getSize(new THREE.Vector3())
  return {center,radius:Math.hypot(size.x,size.z)/2}
}

const obstacleClearance=(route,object)=>{
  const {center,radius}=obstacleFootprint(object)
  return distanceToRoute(route,center.x,center.z)-radius
}

const offsetFromRoute=(route,index,salt,minDistance,maxDistance,radius=0)=>{
  const progress=.015+hashed(index,salt)*.97
  const point=route.getPointAt(progress)
  const tangent=route.getTangentAt(progress).normalize()
  const side=hashed(index,salt+1)<.5?-1:1
  let distance=THREE.MathUtils.lerp(minDistance,maxDistance,hashed(index,salt+2))
  const along=(hashed(index,salt+3)-.5)*3.8
  let x
  let z
  do{
    x=point.x-tangent.z*side*distance+tangent.x*along
    z=point.z+tangent.x*side*distance+tangent.z*along
    distance+=.35
  }while(distanceToRoute(route,x,z)-radius<ROUTE_CLEARANCE)
  return new THREE.Vector3(x,0,z)
}

const createForestMaterials=m=>({
  trunk:new THREE.MeshStandardMaterial({color:'#302218',roughness:1}),
  bark:new THREE.MeshStandardMaterial({color:'#4a3022',roughness:.98}),
  leaf:[m.leaf,m.leaf2,new THREE.MeshStandardMaterial({color:'#173e29',roughness:.95}),new THREE.MeshStandardMaterial({color:'#2c5c32',roughness:.94})],
  fern:new THREE.MeshStandardMaterial({color:'#3c7644',roughness:.94,side:THREE.DoubleSide}),
  grass:new THREE.MeshStandardMaterial({color:'#6b8547',roughness:.96,side:THREE.DoubleSide}),
  damp:new THREE.MeshStandardMaterial({color:'#271f18',roughness:.88}),
})

const scaledMesh=(geometry,material,position,scale=[1,1,1],rotation=[0,0,0])=>{
  const object=mesh(geometry,material,position,rotation)
  object.scale.set(...scale)
  return object
}

const createCrown=(materials,variant,scale)=>{
  const crown=nameGroup(`crown-silhouette-${variant+1}`)
  const leaf=materials.leaf[variant%materials.leaf.length]
  const add=(geometry,position,size=[1,1,1])=>crown.add(scaledMesh(geometry,leaf,position,size))
  if(variant===0){
    add(new THREE.IcosahedronGeometry(1,1),[0,0,0],[1.5*scale,1.05*scale,1.4*scale])
  }else if(variant===1){
    add(new THREE.SphereGeometry(1,10,7),[0,0,0],[1.75*scale,.72*scale,1.35*scale])
    add(new THREE.SphereGeometry(1,9,6),[.55*scale,.25*scale,0],[.9*scale,.65*scale,.9*scale])
  }else if(variant===2){
    add(new THREE.ConeGeometry(1.35*scale,2.2*scale,8),[0,.15*scale,0])
    add(new THREE.ConeGeometry(1.05*scale,1.7*scale,8),[0,1.05*scale,0])
  }else if(variant===3){
    ;[[-.65,0,0],[.5,.2,.2],[0,.48,-.45]].forEach(([x,y,z],part)=>add(new THREE.DodecahedronGeometry((part?1:1.15)*scale,0),[x*scale,y*scale,z*scale]))
  }else if(variant===4){
    add(new THREE.SphereGeometry(1,10,6),[0,.1*scale,0],[1.9*scale,.55*scale,1.55*scale])
    add(new THREE.ConeGeometry(.75*scale,1.25*scale,7),[-.45*scale,-.35*scale,.2*scale])
  }else{
    add(new THREE.ConeGeometry(1.45*scale,2.5*scale,6),[0,.2*scale,0])
    add(new THREE.IcosahedronGeometry(.72*scale,1),[.65*scale,.45*scale,-.25*scale])
    add(new THREE.IcosahedronGeometry(.6*scale,1),[-.65*scale,.25*scale,.25*scale])
  }
  return crown
}

const createJungleTree=(materials,index,scale)=>{
  const tree=nameGroup(`jungle-tree-${index}`)
  const trunk=mesh(new THREE.CylinderGeometry(.16*scale,.34*scale,3.9*scale,7),materials.trunk,[0,1.95*scale,0])
  trunk.name='tree-trunk'
  tree.add(trunk)
  ;[-1,1].forEach((side,branch)=>{
    const fork=mesh(
      new THREE.CylinderGeometry(.055*scale,.11*scale,1.55*scale,6),
      materials.bark,
      [side*.34*scale,3.15*scale,(branch?-.08:.1)*scale],
      [0,side*.45,side*.72],
    )
    fork.name='tree-branch-fork'
    tree.add(fork)
  })
  const crown=createCrown(materials,index%6,scale)
  crown.position.y=(4.2+(index%3)*.18)*scale
  tree.add(crown)
  return tree
}

const createUndergrowth=(materials,index,scale)=>{
  const plant=nameGroup(`undergrowth-${index}`)
  const variant=index%3
  if(variant===0){
    for(let leaf=0;leaf<5;leaf+=1){
      const angle=leaf/5*Math.PI*2
      plant.add(mesh(
        new THREE.ConeGeometry(.16*scale,.95*scale,5),
        materials.fern,
        [Math.cos(angle)*.18*scale,.35*scale,Math.sin(angle)*.18*scale],
        [Math.sin(angle)*.55,angle,Math.cos(angle)*.55],
      ))
    }
  }else if(variant===1){
    plant.add(
      scaledMesh(new THREE.IcosahedronGeometry(.48*scale,1),materials.leaf[(index+1)%materials.leaf.length],[0,.35*scale,0],[1.4,.75,1]),
      scaledMesh(new THREE.IcosahedronGeometry(.34*scale,1),materials.leaf[(index+2)%materials.leaf.length],[.38*scale,.32*scale,.08*scale],[1,.8,1]),
    )
  }else{
    for(let blade=0;blade<4;blade+=1){
      const angle=(blade/4)*Math.PI*2
      plant.add(mesh(new THREE.ConeGeometry(.055*scale,.72*scale,4),materials.grass,[Math.cos(angle)*.11,.3*scale,Math.sin(angle)*.11],[0,0,(blade-1.5)*.2]))
    }
  }
  return plant
}

const createTrackGeometry=route=>{
  const positions=[]
  const indices=[]
  const segments=100
  for(let index=0;index<=segments;index+=1){
    const progress=index/segments
    const point=route.getPointAt(progress)
    const tangent=route.getTangentAt(progress).normalize()
    const halfWidth=1.18+(index%9===0?.08:0)
    positions.push(
      point.x-tangent.z*halfWidth,point.y-.015,point.z+tangent.x*halfWidth,
      point.x+tangent.z*halfWidth,point.y-.015,point.z-tangent.x*halfWidth,
    )
    if(index<segments){
      const offset=index*2
      indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3)
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const addInlet=(world,m,materials,route,obstacles)=>{
  const inlet=nameGroup('forest-inlet')
  const [landingX,landingY,landingZ]=LANDMARKS.forestLanding
  const water=mesh(new THREE.PlaneGeometry(7.5,9,1,1),m.water,[landingX,landingY-.14,landingZ+3.9],[-Math.PI/2,0,0])
  water.name='forest-inlet-water'
  inlet.add(water)
  ;[-1,1].forEach(side=>{
    const bank=mesh(new THREE.BoxGeometry(3.8,.35,10),materials.damp,[landingX+side*5.25,landingY-.08,landingZ+3.5],[0,side*.08,0])
    bank.name='wet-inlet-bank'
    inlet.add(bank)
    for(let index=0;index<12;index+=1){
      const reed=mesh(new THREE.CylinderGeometry(.018,.035,.85+(index%4)*.15,5),materials.grass,[landingX+side*(3.85+hashed(index,side+5)*1.3),landingY+.35,landingZ+hashed(index,side+8)*7.5])
      reed.name='inlet-reed'
      inlet.add(reed)
    }
    for(let index=0;index<4;index+=1){
      const stoneX=landingX+side*(3.75+hashed(index,side+12)*1.2)
      const stoneZ=landingZ-1+hashed(index,side+16)*8
      const radius=.28+(index%3)*.09
      const stone=mesh(new THREE.DodecahedronGeometry(radius,1),m.stone,[stoneX,landingY-.02,stoneZ],[index*.3,0,index*.16])
      stone.name='inlet-stone'
      inlet.add(stone)
      obstacles.push(stone)
    }
  })
  const landing=nameGroup('forest-water-landing')
  landing.position.set(landingX,landingY,landingZ)
  const waterApproach=new THREE.Vector3(landingX-4.2,landingY-.2,landingZ+72).normalize()
  landing.rotation.y=Math.atan2(waterApproach.x,waterApproach.z)
  const deck=nameGroup('forest-landing-deck')
  deck.position.y=.18
  for(let index=-2;index<=2;index+=1){
    const plank=mesh(new THREE.BoxGeometry(.7,.16,3.2),m.wood,[index*.72,0,0],[0,(index%2)*.018,0])
    plank.name='landing-plank'
    deck.add(plank)
  }
  ;[-1,1].forEach(side=>{
    ;[-1.35,1.35].forEach(z=>{
      const post=mesh(new THREE.CylinderGeometry(.055,.075,1.25,8),materials.bark,[side*1.65,-.35,z])
      post.name='landing-post'
      deck.add(post)
    })
  })
  landing.add(deck)
  inlet.add(landing)
  const roots=nameGroup('jungle-roots')
  ;[-1,1].forEach(side=>{for(let index=0;index<5;index+=1){
    const root=mesh(new THREE.TorusGeometry(.65+index*.08,.045,5,12,Math.PI*1.2),materials.bark,[landingX+side*(3.8+index*.32),landingY+.02,landingZ-1+index*1.55],[-Math.PI/2,index*.37,side*.18])
    root.name='exposed-root'
    roots.add(root)
  }})
  inlet.add(roots)
  const overhang=mesh(new THREE.CylinderGeometry(.12,.2,5.5,7),materials.bark,[landingX-4.9,4.1,landingZ+1.3],[0,0,-1.08])
  overhang.name='overhanging-branch'
  inlet.add(overhang)
  world.add(inlet)
  return landing
}

export function createJungleWorld(m,quality='desktop'){
  const world=nameGroup('jungle-world')
  const materials=cloneMaterialPalette(m)
  const forestMaterials=createForestMaterials(materials)
  const midpointZ=(LANDMARKS.forestLanding[2]+LANDMARKS.forestEnd[2])/2
  world.add(mesh(new THREE.PlaneGeometry(48,58,16,20),forestMaterials.damp,[0,-.18,midpointZ],[-Math.PI/2,0,0]))

  const routePoints=[
    new THREE.Vector3(...LANDMARKS.forestLanding),
    new THREE.Vector3(-1.1,.22,-92),
    new THREE.Vector3(.9,.2,-99),
    new THREE.Vector3(-.65,.2,-106),
    new THREE.Vector3(1.25,.19,-114),
    new THREE.Vector3(-.8,.18,-123),
    new THREE.Vector3(...LANDMARKS.forestEnd),
  ]
  const route=new THREE.CatmullRomCurve3(routePoints)
  const track=nameGroup('forest-track')
  const trackSurface=mesh(createTrackGeometry(route),new THREE.MeshStandardMaterial({color:'#4a3524',roughness:1}))
  trackSurface.name='jeep-track-surface'
  track.add(trackSurface)
  track.userData.curve=route
  world.add(track)

  const obstacles=[]
  const forestLanding=addInlet(world,materials,forestMaterials,route,obstacles)
  const layers=[
    {name:'forest-near-layer',legacy:'jungle-foreground',desktop:40,mobile:24,min:3.1,max:7.2,salt:20},
    {name:'forest-mid-layer',legacy:'jungle-midground',desktop:32,mobile:18,min:7,max:13.5,salt:40},
    {name:'forest-far-layer',legacy:'jungle-background',desktop:24,mobile:14,min:13,max:21,salt:60},
  ]
  let treeCount=0
  layers.forEach(layer=>{
    const group=nameGroup(layer.name)
    const count=quality==='mobile'?layer.mobile:layer.desktop
    for(let index=0;index<count;index+=1){
      const scale=.68+hashed(index,layer.salt+7)*.66
      const radius=.34*scale
      const position=offsetFromRoute(route,index,layer.salt,layer.min,layer.max,radius)
      const tree=createJungleTree(forestMaterials,treeCount,scale)
      tree.position.copy(position)
      tree.rotation.y=hashed(index,layer.salt+9)*Math.PI*2
      group.add(tree)
      obstacles.push(tree.getObjectByName('tree-trunk'))
      treeCount+=1
    }
    world.add(group)
    const legacy=nameGroup(layer.legacy)
    legacy.userData.layer=group
    world.add(legacy)
  })

  const undergrowth=nameGroup('jungle-undergrowth')
  const undergrowthCount=quality==='mobile'?116:192
  for(let index=0;index<undergrowthCount;index+=1){
    const scale=.45+hashed(index,82)*.65
    const position=offsetFromRoute(route,index,80,1.8,20,.25*scale)
    const plant=createUndergrowth(forestMaterials,index,scale)
    plant.position.copy(position)
    plant.rotation.y=hashed(index,84)*Math.PI*2
    undergrowth.add(plant)
  }
  world.add(undergrowth)

  const vines=nameGroup('jungle-vines')
  const vineCount=quality==='mobile'?16:30
  for(let index=0;index<vineCount;index+=1){
    const position=offsetFromRoute(route,index,100,3.2,15,.06)
    const vine=mesh(new THREE.TorusGeometry(.48+(index%4)*.12,.025,5,16,Math.PI*1.45),forestMaterials.leaf[(index+2)%forestMaterials.leaf.length],[position.x,3.1+hashed(index,105)*2.8,position.z],[0,hashed(index,108)*Math.PI,0])
    vine.name=`jungle-vine-${index}`
    vines.add(vine)
  }
  world.add(vines)

  const rocks=nameGroup('jungle-rocks')
  const rockCount=quality==='mobile'?10:22
  for(let index=0;index<rockCount;index+=1){
    const radius=.24+(index%4)*.11
    const position=offsetFromRoute(route,index,120,3.1,13,radius)
    const rock=mesh(new THREE.DodecahedronGeometry(radius,1),materials.stone,[position.x,.1,position.z],[index*.2,0,index*.1])
    rock.name='jungle-rock'
    rocks.add(rock)
    obstacles.push(rock)
  }
  world.add(rocks)

  const fallenTimber=nameGroup('jungle-fallen-timber')
  const logCount=quality==='mobile'?5:9
  for(let index=0;index<logCount;index+=1){
    const halfLength=1.1+(index%3)*.28
    const position=offsetFromRoute(route,index,140,4.5,15,Math.hypot(halfLength,.23))
    const log=mesh(new THREE.CylinderGeometry(.16,.23,halfLength*2,7),forestMaterials.bark,[position.x,.22,position.z],[Math.PI/2,hashed(index,144)*Math.PI,0])
    log.name='fallen-log'
    fallenTimber.add(log)
    obstacles.push(log)
  }
  world.add(fallenTimber)

  const puddles=nameGroup('jungle-puddles')
  for(let index=0;index<(quality==='mobile'?4:8);index+=1){
    const progress=.12+index/(quality==='mobile'?4:8)*.78
    const point=route.getPointAt(progress)
    const tangent=route.getTangentAt(progress).normalize()
    const side=index%2?-1:1
    puddles.add(scaledMesh(new THREE.CircleGeometry(.55+(index%3)*.18,20),materials.water,[point.x-tangent.z*side*.72,.235,point.z+tangent.x*side*.72],[1,.55,1],[-Math.PI/2,0,hashed(index,155)]))
  }
  world.add(puddles)

  const mist=nameGroup('jungle-mist')
  const mistMaterial=new THREE.MeshBasicMaterial({color:'#b8d2be',transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide})
  for(let index=0;index<(quality==='mobile'?4:9);index+=1){
    const point=route.getPointAt(.08+index/(quality==='mobile'?4:9)*.86)
    const veil=mesh(new THREE.PlaneGeometry(15,3.2),mistMaterial,[point.x+(index%3-1)*5,1.35,point.z],[0,(hashed(index,162)-.5)*.45,0])
    veil.name='mist-veil'
    mist.add(veil)
  }
  world.add(mist)

  const shafts=nameGroup('jungle-sun-shafts')
  const shaftMaterial=new THREE.MeshBasicMaterial({color:'#f7e4a7',transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide})
  for(let index=0;index<(quality==='mobile'?2:4);index+=1){
    const point=route.getPointAt(.2+index*.2)
    shafts.add(mesh(new THREE.ConeGeometry(1.1,11,8,1,true),shaftMaterial,[point.x+(index%2?-3.5:3.5),5.5,point.z],[0,0,(index%2?-1:1)*.14]))
  }
  world.add(shafts)

  const outpost=nameGroup('ranger-outpost')
  outpost.position.set(-7,0,-128)
  outpost.add(
    mesh(new THREE.BoxGeometry(5,.5,3.5),materials.wood,[0,.25,0]),
    mesh(new THREE.BoxGeometry(4,2.4,2.7),materials.sand,[0,1.7,0]),
    mesh(new THREE.ConeGeometry(3.5,1.5,4),materials.leaf,[0,3.55,0],[0,Math.PI/4,0]),
    mesh(new THREE.BoxGeometry(2.4,1.15,.08),materials.dark,[0,1.9,1.39]),
  )
  world.add(outpost)

  const light=new THREE.SpotLight('#ffd98a',34,42,.5,.75)
  light.position.set(-8,16,-101)
  light.target.position.set(0,0,-114)
  world.add(light,light.target)

  world.updateMatrixWorld(true)
  const routeClearance=obstacles.reduce((minimum,obstacle)=>Math.min(minimum,obstacleClearance(route,obstacle)),Infinity)
  world.userData={
    route,
    routeClearance,
    routeObstacles:obstacles,
    counts:{trees:treeCount,undergrowth:undergrowthCount},
    forestLanding,
    copyAnchor:new THREE.Vector3(-7,3,-128),
  }
  return world
}
