import * as THREE from 'three'
import { mesh } from './primitives'
import { createEnvironmentMaterial,createLandscapeMaterial,createFoliageMaterial,createLeafTexture,createCanopyTexture,createRippleNormalMap,projectGroundUV } from './environmentSurface'
import { LANDMARKS } from './terrain'
import { FINALE_CAMERAS,WATERFALL,WATERFALL_VIEWING_POSITIONS,sampleFinaleWater } from './finaleConfig'
import { createForestGroundGeometry,createForestTreeGeometry,createForestUnderstoryGeometry } from './forestGeometry'
import { createForestRoute,distanceToForestRoute as distanceToRoute,sampleForestGroundHeight,sampleLandingGroundHeight,refineForestLandingGeometry,matchLandingBoundaryNormals } from './forestTerrain'
import { mapJourneyZ,shiftFinaleZ } from './journeySpatial'
import { createRiverRoute,sampleRiverSurface } from './riverConfig'
import { createForestWildlife } from './forestWildlife'

const ROUTE_CLEARANCE=1.4
const nameGroup=name=>{const group=new THREE.Group();group.name=name;return group}
const JUNGLE_PALETTE_KEYS=['leaf','stone','water','wood','sand','dark']
const cloneMaterialPalette=materials=>Object.fromEntries(
  JUNGLE_PALETTE_KEYS.map(name=>[name,
    name==='wood'?createEnvironmentMaterial('#645449','bark'):
    name==='stone'?createEnvironmentMaterial('#787970','rock'):
    materials[name].clone(),
  ]),
)
const hashed=(index,salt=0)=>{
  const value=Math.sin((index+1)*127.1+(salt+1)*311.7)*43758.5453123
  return value-Math.floor(value)
}

const distanceToSegmentXZ=(x,z,start,end)=>{
  const dx=end.x-start.x,dz=end.z-start.z
  const lengthSquared=dx*dx+dz*dz
  const t=THREE.MathUtils.clamp(((x-start.x)*dx+(z-start.z)*dz)/(lengthSquared||1),0,1)
  return Math.hypot(x-(start.x+dx*t),z-(start.z+dz*t))
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

const inFinaleClearing=(x,z,radius=0)=>
  (x+radius>-6&&x-radius<8&&z+radius>shiftFinaleZ(-145)&&z-radius<shiftFinaleZ(-129))||
  (Math.abs(x-WATERFALL.center[0])-radius<24&&z+radius>shiftFinaleZ(-161)&&z-radius<shiftFinaleZ(-144))

const inFinaleWater=(x,z,radius=0)=>
  z-radius<shiftFinaleZ(-130)&&sampleFinaleWater(x,z).edgeDistance<radius+.6

const offsetFromRoute=(route,index,salt,minDistance,maxDistance,radius=0,sightlines=[],grove=false)=>{
  const progress=grove
    ?THREE.MathUtils.clamp(.04+hashed(Math.floor(index/5),salt+71)*.92+(hashed(index,salt)-.5)*.16,.015,.985)
    :.015+hashed(index,salt)*.97
  const point=route.getPointAt(progress)
  const tangent=route.getTangentAt(progress).normalize()
  const side=hashed(index,salt+1)<.5?-1:1
  let distance=THREE.MathUtils.lerp(minDistance,maxDistance,hashed(index,salt+2))
  const along=(hashed(index,salt+3)-.5)*3.8
  let x
  let z
  let waterRetreat=0
  let wet
  do{
    x=point.x-tangent.z*side*distance+tangent.x*along
    z=point.z+tangent.x*side*distance+tangent.z*along+waterRetreat
    wet=inFinaleWater(x,z,radius)
    if(wet) waterRetreat+=.75
    distance+=.35
  }while(
    distanceToRoute(route,x,z)-radius<ROUTE_CLEARANCE||
    inFinaleClearing(x,z,radius)||
    wet||
    sightlines.some(({start,end,clearance})=>
      distanceToSegmentXZ(x,z,start,end)-radius<clearance
    )||
    sightlines.some(({start,cameraClearance=clearance})=>
      Math.hypot(x-start.x,z-start.z)-radius<cameraClearance
    )
  )
  return new THREE.Vector3(x,0,z)
}

const createForestMaterials=()=>{
  const leafMap=createLeafTexture()
  const canopyMap=createCanopyTexture()
  return{
    trunk:createEnvironmentMaterial('#655d4e','bark'),
    trunkAlt:createEnvironmentMaterial('#756a58','bark'),
    bark:createEnvironmentMaterial('#685b48','bark'),
    barkAlt:createEnvironmentMaterial('#7b6d54','bark'),
    leaf:['#2e7c38','#448f3c','#296d3b','#39833a','#4a923f','#347c42']
      .map(color=>createFoliageMaterial(color,canopyMap)),
    fern:createFoliageMaterial('#3d8640',leafMap),
    grass:new THREE.MeshStandardMaterial({color:'#7b8457',roughness:.98,side:THREE.DoubleSide}),
  }
}

const createForestGroundMaterial=()=>{
  const material=createLandscapeMaterial({bumpScale:.045})
  material.color.set('#8daa79')
  const compile=material.onBeforeCompile
  const cacheKey=material.customProgramCacheKey()
  material.onBeforeCompile=shader=>{
    compile(shader)
    shader.fragmentShader=shader.fragmentShader
      .replace('float wetEdge=1.0-smoothstep(0.12,0.72,vLandWorld.y);',
        'float wetEdge=1.0-smoothstep(-0.06,0.12,vLandWorld.y);')
      .replace('*cos(vLandWorld.z*.37)*.5+.5)*.32;',
        '*cos(vLandWorld.z*.37)*.5+.5)*.12;')
  }
  material.customProgramCacheKey=()=>`${cacheKey}-forest-floor-v1`
  material.userData.forestFloor='moss-and-low-groundcover'
  return material
}

const createMistMaterial=()=>{
  const material=new THREE.MeshBasicMaterial({
    color:'#b8d2be',
    transparent:true,
    opacity:.018,
    depthWrite:false,
    side:THREE.DoubleSide,
  })
  material.userData.edgeFade='all-edges'
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',`#include <common>
varying vec2 vMistUv;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
vMistUv = uv;`)
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
varying vec2 vMistUv;`)
      .replace('#include <opaque_fragment>',`float mistEdgeAlpha =
  smoothstep(0.0, 0.2, vMistUv.x) *
  smoothstep(0.0, 0.2, 1.0 - vMistUv.x) *
  smoothstep(0.0, 0.28, vMistUv.y) *
  smoothstep(0.0, 0.28, 1.0 - vMistUv.y);
diffuseColor.a *= mistEdgeAlpha;
#include <opaque_fragment>`)
  }
  material.customProgramCacheKey=()=> 'jungle-mist-all-edges'
  return material
}

const scaledMesh=(geometry,material,position,scale=[1,1,1],rotation=[0,0,0])=>{
  const object=mesh(geometry,material,position,rotation)
  object.scale.set(...scale)
  return object
}

const createCrown=(materials,variant,geometry)=>{
  const crown=nameGroup(`crown-silhouette-${variant+1}`)
  const leaf=materials.leaf[variant%materials.leaf.length]
  const leaves=mesh(geometry,leaf)
  leaves.name='individual-canopy-leaves'
  crown.add(leaves)
  return crown
}

const createJungleTree=(materials,index,scale,geometry,variant=index%6)=>{
  const tree=nameGroup(`jungle-tree-${index}`)
  const trunk=mesh(
    geometry.skeleton,
    index%3?materials.trunk:materials.trunkAlt,
  )
  trunk.name='tree-trunk'
  tree.add(trunk)
  const crown=createCrown(materials,variant,geometry.crown)
  tree.add(crown)
  tree.scale.set(scale*(.84+hashed(index,11)*.3),scale,scale*(.85+hashed(index,12)*.29))
  tree.userData.growthForm=variant
  tree.userData.ageScale=scale
  return tree
}

const createUndergrowth=(materials,index,scale)=>{
  const plant=nameGroup(`undergrowth-${index}`)
  const foliage=mesh(
    createForestUnderstoryGeometry({seed:index+140,variant:index%3===0?4:1,scale:scale*.38,leaves:36}),
    index%3===0?materials.fern:materials.leaf[(index+1)%materials.leaf.length],
    [0,-.025,0],
  )
  plant.add(foliage)
  return plant
}

const addUnderstoryGroves=(world,materials,route,heightAt,sightlines,quality)=>{
  const group=nameGroup('forest-lush-understory')
  const count=quality==='mobile'?26:38
  const placements=[]
  const transform=new THREE.Object3D()
  for(let variant=0;variant<6;variant++){
    const geometry=createForestUnderstoryGeometry({seed:710+variant,variant:variant%3===0?4:1,scale:1.1,leaves:quality==='mobile'?120:170})
    const material=variant%3===0?materials.fern:materials.leaf[variant]
    const shrubs=new THREE.InstancedMesh(geometry,material,count)
    shrubs.name=`forest-shrub-grove-${variant}`
    const bounds=geometry.boundingBox
    const radius=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))
    for(let index=0;index<count;index++){
      const key=index+variant*count
      const scale=.72+hashed(key,718)*.62
      const position=offsetFromRoute(route,key,710,3.1,18,radius*scale,sightlines,true)
      position.y=heightAt(position.x,position.z)-bounds.min.y*scale*.85-.06
      transform.position.copy(position)
      transform.rotation.y=hashed(key,719)*Math.PI*2
      transform.scale.set(scale,scale*.85,scale)
      transform.updateMatrix()
      shrubs.setMatrixAt(index,transform.matrix)
      placements.push({x:position.x,z:position.z,radius:radius*scale})
    }
    shrubs.receiveShadow=true
    shrubs.computeBoundingBox()
    shrubs.computeBoundingSphere()
    group.add(shrubs)
  }
  group.userData.placements=placements
  world.add(group)
  return placements.length
}

const addForestBackdrop=(world,materials,quality,heightAt,sightlines)=>{
  const backdrop=nameGroup('forest-dense-backdrop')
  const instances=[]
  const count=quality==='mobile'?14:22
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scaleVector=new THREE.Vector3()
  const axis=new THREE.Vector3(0,1,0)
  for(let variant=0;variant<6;variant+=1){
    const distant=createForestTreeGeometry(variant,quality,{distant:true})
    const skeleton=distant.skeleton
    const wood=new THREE.InstancedMesh(skeleton,materials.trunk,count)
    const crowns=new THREE.InstancedMesh(distant.crown,materials.leaf[variant],count)
    wood.name=`forest-belt-trunks-${variant}`
    crowns.name=`forest-belt-canopies-${variant}`
    const bounds=distant.crown.boundingBox
    const baseRadius=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))
    for(let index=0;index<count;index+=1){
      const key=variant*count+index
      const side=key%2?-1:1
      const scale=.72+Math.pow(hashed(key,202),.65)*.73
      const width=.83+hashed(key,208)*.32
      const radius=baseRadius*scale*Math.max(width,1/width)
      let z=mapJourneyZ(-91-hashed(key,203)*80)
      let x=side*(29+hashed(key,204)*34)
      while(inFinaleClearing(x,z,radius)||inFinaleWater(x,z,radius)||sightlines.some(({start,end,clearance,cameraClearance=clearance})=>
        distanceToSegmentXZ(x,z,start,end)-radius<clearance||
        Math.hypot(x-start.x,z-start.z)-radius<cameraClearance
      )){
        if(inFinaleWater(x,z,radius)) z-=.65
        else x+=side*.65
      }
      const position=new THREE.Vector3(x,heightAt(x,z),z)
      quaternion.setFromAxisAngle(axis,hashed(key,205)*Math.PI*2)
      matrix.compose(position,quaternion,scaleVector.set(scale*width,scale,scale/width))
      wood.setMatrixAt(index,matrix)
      crowns.setMatrixAt(index,matrix)
      instances.push({x,z,radius,height:bounds.max.y*scale})
    }
    for(const object of [wood,crowns]){
      object.castShadow=quality==='desktop'
      object.receiveShadow=true
      object.computeBoundingBox()
      object.computeBoundingSphere()
      backdrop.add(object)
    }
  }
  backdrop.userData.instances=instances
  world.add(backdrop)
  return instances.length
}

const addFinaleThickets=(world,materials,treeGeometries,quality,heightAt,sightlines)=>{
  const thickets=nameGroup('forest-finale-thickets')
  const instances=[]
  const rows=quality==='mobile'?4:6
  const columns=4
  const count=rows*columns
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scaleVector=new THREE.Vector3()
  const axis=new THREE.Vector3(0,1,0)
  for(let species=0;species<2;species+=1){
    const variant=species?4:2
    const {crown}=treeGeometries[variant]
    const distant=createForestTreeGeometry(variant,quality,{distant:true})
    const wood=new THREE.InstancedMesh(distant.skeleton,materials.trunk,count)
    const crowns=new THREE.InstancedMesh(distant.crown,materials.leaf[variant],count)
    const understory=new THREE.InstancedMesh(crown,materials.leaf[species?1:2],count)
    wood.name=`finale-thicket-trunks-${species}`
    crowns.name=`finale-thicket-crowns-${species}`
    understory.name=`finale-thicket-understory-${species}`
    const bounds=crown.boundingBox
    const baseRadius=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))
    for(let index=0;index<count;index+=1){
      const key=species*count+index
      const side=index%2?-1:1
      const column=Math.floor(index/2)%columns
      const row=Math.floor(index/(columns*2))*2+species
      const scale=.8+hashed(key,303)*.54
      const radius=baseRadius*scale
      const rearProgress=row/(rows-1)
      let z=shiftFinaleZ(-149-rearProgress*23-hashed(key,304)*(4.2-rearProgress*3.3))
      let x=WATERFALL.center[0]+side*(28+column*4.5+hashed(key,305)*3.4)
      while(inFinaleClearing(x,z,radius)||inFinaleWater(x,z,radius)||sightlines.some(({start,end,clearance,cameraClearance=clearance})=>
        distanceToSegmentXZ(x,z,start,end)-radius<clearance||
        Math.hypot(x-start.x,z-start.z)-radius<cameraClearance
      )){
        if(inFinaleWater(x,z,radius)) z-=.65
        else x+=side*.65
      }
      const groundY=heightAt(x,z)
      const position=new THREE.Vector3(x,groundY,z)
      quaternion.setFromAxisAngle(axis,hashed(key,306)*Math.PI*2)
      matrix.compose(position,quaternion,scaleVector.setScalar(scale))
      wood.setMatrixAt(index,matrix)
      crowns.setMatrixAt(index,matrix)
      // A second, low crown closes the open trunk layer at the terrain edge.
      position.y=groundY+.25-bounds.min.y*scale*.62
      matrix.compose(position,quaternion,scaleVector.set(scale,scale*.62,scale))
      understory.setMatrixAt(index,matrix)
      instances.push({x,z,radius,height:bounds.max.y*scale})
    }
    for(const object of [wood,crowns,understory]){
      object.receiveShadow=true
      object.computeBoundingBox()
      object.computeBoundingSphere()
      thickets.add(object)
    }
  }
  thickets.userData.instances=instances
  world.add(thickets)
  return instances.length
}

const createTrackGeometry=route=>{
  const positions=[]
  const indices=[]
  const segments=180
  for(let index=0;index<=segments+1;index+=1){
    const progress=Math.min(index/segments,1)
    const point=route.getPointAt(progress)
    const tangent=route.getTangentAt(progress).normalize()
    if(index>segments){
      point.addScaledVector(tangent.clone().setY(0).normalize(),2)
    }
    const halfWidth=1.18+Math.sin(Math.min(index,segments)*1.73)*.06
    positions.push(
      point.x-tangent.z*halfWidth,point.y-.015,point.z+tangent.x*halfWidth,
      point.x+tangent.z*halfWidth,point.y-.015,point.z-tangent.x*halfWidth,
    )
  }
  let landingProgress=0
  for(let index=0;index<segments+1;index++){
    const offset=index*2
    // Dirt starts on the dry bank. The jetty connection is a supported timber
    // gangway, so no road ribbon is suspended over the incoming river bend.
    const dry=[offset,offset+1,offset+2,offset+3].every(vertex=>
      sampleRiverSurface(positions[vertex*3],positions[vertex*3+2]).edgeDistance>.35,
    )
    if(!dry) continue
    if(indices.length===0) landingProgress=index/segments
    indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.userData.landingProgress=landingProgress
  geometry.computeVertexNormals()
  return projectGroundUV(geometry,1.2)
}

const createLandingGangway=(route,landingProgress)=>{
  const gangway=nameGroup('forest-landing-gangway')
  const direction=createRiverRoute().getTangentAt(1).setY(0).normalize()
  const start=new THREE.Vector3(...LANDMARKS.forestLanding).addScaledVector(direction,1.43)
  start.y=LANDMARKS.forestLanding[1]+.26
  const end=route.getPointAt(Math.min(1,landingProgress+.004))
  end.y-=.015
  const along=end.clone().sub(start)
  const horizontal=Math.hypot(along.x,along.z),length=along.length()
  const lateral=new THREE.Vector3(along.z,0,-along.x).normalize()
  const heading=Math.atan2(along.x,along.z),pitch=-Math.atan2(along.y,horizontal)
  const timber=createEnvironmentMaterial('#786b55','wood')
  const count=Math.ceil(length/.3),plankGeometry=new THREE.BoxGeometry(1.48,.14,length/count*.96)
  for(let index=0;index<count;index++){
    const point=start.clone().lerp(end,(index+.5)/count)
    point.y-=.07
    const plank=mesh(plankGeometry,timber,point.toArray())
    plank.name='forest-gangway-plank'
    plank.rotation.set(pitch,heading,0,'YXZ')
    gangway.add(plank)
  }
  const beamGeometry=new THREE.BoxGeometry(.12,.18,length)
  for(const side of [-1,1]){
    const center=start.clone().lerp(end,.5).addScaledVector(lateral,side*.56)
    center.y-=.2
    const beam=mesh(beamGeometry,timber,center.toArray())
    beam.rotation.set(pitch,heading,0,'YXZ')
    beam.name='forest-gangway-beam'
    gangway.add(beam)
    for(const t of [.12,1]){
      const point=start.clone().lerp(end,t).addScaledVector(lateral,side*.56)
      const ground=sampleLandingGroundHeight(route,point.x,point.z)-.08
      const height=Math.max(.16,point.y-.12-ground)
      const support=mesh(new THREE.CylinderGeometry(.065,.085,height,7),timber,[point.x,ground+height/2,point.z])
      support.name='forest-gangway-support'
      gangway.add(support)
    }
  }
  return gangway
}

const addInlet=(world,m,materials,route,obstacles,landingProgress)=>{
  const inlet=nameGroup('forest-inlet')
  const [landingX,landingY,landingZ]=LANDMARKS.forestLanding
  ;[-1,1].forEach(side=>{
    for(let index=0;index<12;index+=1){
      const x=landingX+side*(3.85+hashed(index,side+5)*1.3)
      const z=landingZ+hashed(index,side+8)*7.5
      const height=.85+(index%4)*.15
      const reed=mesh(new THREE.CylinderGeometry(.018,.035,height,5),materials.grass,[x,sampleLandingGroundHeight(route,x,z)+height/2-.03,z])
      reed.name='inlet-reed'
      inlet.add(reed)
    }
    for(let index=0;index<4;index+=1){
      const stoneX=landingX+side*(3.75+hashed(index,side+12)*1.2)
      const stoneZ=landingZ-1+hashed(index,side+16)*8
      const radius=.28+(index%3)*.09
      const stone=mesh(new THREE.DodecahedronGeometry(radius,1),m.stone,[stoneX,sampleLandingGroundHeight(route,stoneX,stoneZ)+radius*.45,stoneZ],[index*.3,0,index*.16])
      stone.name='inlet-stone'
      inlet.add(stone)
      obstacles.push(stone)
    }
  })
  const landing=nameGroup('forest-water-landing')
  landing.position.set(landingX,landingY,landingZ)
  const waterApproach=createRiverRoute().getTangentAt(1)
  landing.rotation.y=Math.atan2(waterApproach.x,waterApproach.z)
  const deck=nameGroup('forest-landing-deck')
  deck.position.y=.18
  deck.userData.surfaceOwner='forest-jetty'
  landing.add(deck)
  inlet.add(landing)
  inlet.add(createLandingGangway(route,landingProgress))
  const roots=nameGroup('jungle-roots')
  ;[-1,1].forEach(side=>{for(let index=0;index<5;index+=1){
    const x=landingX+side*(3.8+index*.32),z=landingZ-1+index*1.55
    const root=mesh(
      new THREE.CylinderGeometry(.035,.065,.9+index*.18,6),
      materials.bark,
      [x,sampleLandingGroundHeight(route,x,z)+.03,z],
      [Math.PI/2,0,side*(.55+index*.16)],
    )
    root.name='exposed-root'
    roots.add(root)
  }})
  inlet.add(roots)
  world.add(inlet)
  return landing
}

export function createJungleWorld(m,quality='desktop'){
  const world=nameGroup('jungle-world')
  const materials=cloneMaterialPalette(m)
  const forestMaterials=createForestMaterials()
  materials.water.color.set('#52665d')
  materials.water.roughness=.19
  materials.water.metalness=0
  materials.water.normalMap=createRippleNormalMap()
  materials.water.normalScale=new THREE.Vector2(.25,.25)
  const route=createForestRoute()
  const heightAt=(x,z)=>sampleForestGroundHeight(route,x,z)
  const wildlife=createForestWildlife({route,heightAt,quality})
  const wildlifeClearings=wildlife.group.userData.animals.map(({anchor,clearingRadius})=>({
    start:anchor,end:anchor,clearance:clearingRadius,cameraClearance:clearingRadius,
  }))
  const forestGround=mesh(
    matchLandingBoundaryNormals(refineForestLandingGeometry(createForestGroundGeometry(heightAt,quality),route),route),
    createForestGroundMaterial(),
  )
  forestGround.name='forest-ground'
  world.add(forestGround,wildlife.group)
  const drivingSightlines=[.04,.18,.32,.5,.68,.84,1].flatMap(progress=>{
    const end=route.getPointAt(progress)
    return [[4,4,25],[3,4,13.5]].map(cameraOffset=>({
      start:end.clone().add(new THREE.Vector3(...cameraOffset)),
      end,
      clearance:1.1,
      cameraClearance:8.2,
    }))
  })
  const finaleSightlines=Object.values(FINALE_CAMERAS).map(({camera,target})=>({
    start:new THREE.Vector3(...camera),
    end:new THREE.Vector3(...target),
    clearance:3.8,
    cameraClearance:4,
  }))
  const viewingSightlines=WATERFALL_VIEWING_POSITIONS.map(position=>({
    start:new THREE.Vector3(...position),
    end:new THREE.Vector3(...WATERFALL.center),
    clearance:3,
    cameraClearance:2,
  }))
  const sightlines=[...drivingSightlines,...finaleSightlines,...viewingSightlines]
  const treeSightlines=[...sightlines,...wildlifeClearings]
  const track=nameGroup('forest-track')
  const trackSurface=mesh(createTrackGeometry(route),createEnvironmentMaterial('#79705a','soil',{bumpScale:.035}))
  trackSurface.name='jeep-track-surface'
  track.add(trackSurface)
  track.userData.curve=route
  world.add(track)

  const obstacles=[]
  const forestLanding=addInlet(world,materials,forestMaterials,route,obstacles,trackSurface.geometry.userData.landingProgress)
  const treeGeometries=Array.from({length:6},(_,variant)=>createForestTreeGeometry(variant,quality))
  const layers=[
    {name:'forest-near-layer',legacy:'jungle-foreground',desktop:64,mobile:44,min:5,max:10,salt:20,scale:.72},
    {name:'forest-mid-layer',legacy:'jungle-midground',desktop:58,mobile:46,min:10,max:19,salt:40,scale:.9},
    {name:'forest-far-layer',legacy:'jungle-background',desktop:44,mobile:36,min:19,max:31,salt:60,scale:1.02},
  ]
  let treeCount=0
  const sightlineTrees=[]
  layers.forEach(layer=>{
    const group=nameGroup(layer.name)
    const count=quality==='mobile'?layer.mobile:layer.desktop
    for(let index=0;index<count;index+=1){
      const scale=layer.scale*(.69+Math.pow(hashed(index,layer.salt+7),.62)*.64)
      const variant=Math.floor(hashed(index,layer.salt+8)*treeGeometries.length)
      const tree=createJungleTree(forestMaterials,treeCount,scale,treeGeometries[variant],variant)
      tree.rotation.y=hashed(index,layer.salt+9)*Math.PI*2
      tree.updateMatrixWorld(true)
      const {center,radius}=obstacleFootprint(tree)
      const position=offsetFromRoute(route,index,layer.salt,layer.min,layer.max,radius,treeSightlines,true)
      position.x-=center.x
      position.z-=center.z
      position.y=heightAt(position.x,position.z)
      tree.position.copy(position)
      group.add(tree)
      sightlineTrees.push(tree)
      obstacles.push(tree.getObjectByName('tree-trunk'))
      treeCount+=1
    }
    world.add(group)
    const legacy=nameGroup(layer.legacy)
    legacy.userData.layer=group
    world.add(legacy)
  })
  treeCount+=addForestBackdrop(world,forestMaterials,quality,heightAt,treeSightlines)
  treeCount+=addFinaleThickets(world,forestMaterials,treeGeometries,quality,heightAt,treeSightlines)

  const undergrowth=nameGroup('jungle-undergrowth')
  const undergrowthCount=quality==='mobile'?200:276
  const undergrowthSightlines=sightlines.map(sightline=>({
    ...sightline,
    clearance:.78,
    cameraClearance:4.15,
  })).concat(wildlifeClearings)
  const shrubCount=addUnderstoryGroves(world,forestMaterials,route,heightAt,undergrowthSightlines,quality)
  for(let index=0;index<undergrowthCount;index+=1){
    const scale=.45+hashed(index,82)*.65
    const plant=createUndergrowth(forestMaterials,index,scale)
    plant.updateMatrixWorld(true)
    const radius=obstacleFootprint(plant).radius
    const position=offsetFromRoute(route,index,80,1.8,20,radius+.25,undergrowthSightlines)
    position.y=heightAt(position.x,position.z)
    plant.position.copy(position)
    plant.rotation.y=hashed(index,84)*Math.PI*2
    undergrowth.add(plant)
  }
  world.add(undergrowth)

  const routeCoverCount=quality==='mobile'?180:300
  const bankCoverCount=routeCoverCount+32
  const bankCover=new THREE.InstancedMesh(
    createForestUnderstoryGeometry({seed:301,variant:4,scale:.6,leaves:64}),
    forestMaterials.fern,
    bankCoverCount,
  )
  bankCover.name='forest-bank-groundcover'
  const coverBounds=bankCover.geometry.boundingBox
  const coverRadius=Math.hypot(Math.max(Math.abs(coverBounds.min.x),Math.abs(coverBounds.max.x)),Math.max(Math.abs(coverBounds.min.z),Math.abs(coverBounds.max.z)))
  const coverMatrix=new THREE.Matrix4(),coverRotation=new THREE.Quaternion(),coverScale=new THREE.Vector3()
  for(let index=0;index<bankCoverCount;index+=1){
    const side=index%2?-1:1
    const scale=.7+hashed(index,317)*.6
    const position=index<routeCoverCount
      ?offsetFromRoute(route,index,310,3.2,29,.9,undergrowthSightlines)
      :new THREE.Vector3(1+side*(8.5+hashed(index,313)*3.8),0,shiftFinaleZ(-139.5-hashed(index,314)*6))
    while(inFinaleWater(position.x,position.z,coverRadius*scale)) position.z+=.35
    position.y=heightAt(position.x,position.z)-.025
    coverRotation.setFromAxisAngle(new THREE.Vector3(0,1,0),hashed(index,316)*Math.PI*2)
    coverMatrix.compose(position,coverRotation,coverScale.setScalar(scale))
    bankCover.setMatrixAt(index,coverMatrix)
  }
  bankCover.receiveShadow=true
  bankCover.computeBoundingBox()
  bankCover.computeBoundingSphere()
  world.add(bankCover)

  const vines=nameGroup('jungle-vines')
  const vineCount=quality==='mobile'?16:30
  const vineTrees=sightlineTrees.filter(tree=>tree.position.z>mapJourneyZ(-126)&&!inFinaleClearing(tree.position.x,tree.position.z,5))
  const vineAnchors=new Map()
  for(let index=0;index<vineCount;index+=1){
    const tree=vineTrees[Math.floor(index*vineTrees.length/vineCount)]
    const skeleton=tree.getObjectByName('tree-trunk').geometry
    if(!vineAnchors.has(skeleton)){
      const anchors=[]
      const positions=skeleton.getAttribute('position')
      for(let vertex=0;vertex<positions.count;vertex+=1){
        const point=new THREE.Vector3().fromBufferAttribute(positions,vertex)
        const radius=Math.hypot(point.x,point.z)
        if(point.y>skeleton.userData.trunkHeight*.42&&point.y<skeleton.userData.trunkHeight*.82&&radius>.9&&radius<2.8) anchors.push(point)
      }
      vineAnchors.set(skeleton,anchors)
    }
    const anchors=vineAnchors.get(skeleton)
    const anchor=anchors[Math.floor(hashed(index,105)*anchors.length)].clone()
    const length=2.15+hashed(index,106)*.9
    const curve=new THREE.CatmullRomCurve3([
      anchor,
      new THREE.Vector3(anchor.x*.94,anchor.y-length*.28,anchor.z*.97),
      new THREE.Vector3(anchor.x*.78,anchor.y-length*.76,anchor.z*.88),
      new THREE.Vector3(anchor.x*.83,anchor.y-length,anchor.z*.74),
    ])
    const vine=mesh(new THREE.TubeGeometry(curve,12,.022,4,false),forestMaterials.bark)
    vine.name=`jungle-vine-${index}`
    vine.userData.branchAnchor=anchor.toArray()
    tree.add(vine)
  }
  vines.userData.attachedCount=vineCount
  world.add(vines)

  const rocks=nameGroup('jungle-rocks')
  const rockCount=quality==='mobile'?10:22
  for(let index=0;index<rockCount;index+=1){
    const radius=.24+(index%4)*.11
    const position=offsetFromRoute(route,index,120,3.1,13,radius,wildlifeClearings)
    const rock=mesh(new THREE.DodecahedronGeometry(radius,1),materials.stone,[position.x,heightAt(position.x,position.z)+.1,position.z],[index*.2,0,index*.1])
    rock.name='jungle-rock'
    rocks.add(rock)
    obstacles.push(rock)
  }
  world.add(rocks)

  const fallenTimber=nameGroup('jungle-fallen-timber')
  const logCount=quality==='mobile'?5:9
  for(let index=0;index<logCount;index+=1){
    const halfLength=1.1+(index%3)*.28
    const position=offsetFromRoute(route,index,140,4.5,15,Math.hypot(halfLength,.23),wildlifeClearings)
    const log=mesh(new THREE.CylinderGeometry(.16,.23,halfLength*2,7),index%2?forestMaterials.bark:forestMaterials.barkAlt,[position.x,heightAt(position.x,position.z)+.22,position.z],[Math.PI/2,hashed(index,144)*Math.PI,0])
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
  const mistMaterial=createMistMaterial()
  for(let index=0;index<(quality==='mobile'?4:9);index+=1){
    const point=route.getPointAt(.08+index/(quality==='mobile'?4:9)*.86)
    const veil=mesh(new THREE.PlaneGeometry(9,1.7),mistMaterial,[point.x+(index%3-1)*5,1.05,point.z],[0,(hashed(index,162)-.5)*.45,0])
    veil.name='mist-veil'
    mist.add(veil)
  }
  world.add(mist)

  const shafts=nameGroup('jungle-sun-shafts')
  const shaftMaterial=new THREE.MeshBasicMaterial({color:'#f7e4a7',transparent:true,opacity:.025,depthWrite:false,side:THREE.DoubleSide})
  for(let index=0;index<(quality==='mobile'?2:4);index+=1){
    const point=route.getPointAt(.2+index*.2)
    const tangent=route.getTangentAt(.2+index*.2).normalize()
    const side=index%2?-1:1
    const shaft=mesh(
      new THREE.ConeGeometry(.72,10,10,1,true),
      shaftMaterial,
      [point.x-tangent.z*side*7.2,5,point.z+tangent.x*side*7.2],
      [0,0,side*.1],
    )
    shaft.name=`jungle-sun-shaft-${index+1}`
    shafts.add(shaft)
  }
  world.add(shafts)

  const outpost=nameGroup('ranger-outpost')
  outpost.position.set(-43,heightAt(-43,mapJourneyZ(-110)),mapJourneyZ(-110))
  outpost.add(
    mesh(new THREE.BoxGeometry(5,.5,3.5),materials.wood,[0,.25,0]),
    mesh(new THREE.BoxGeometry(4,2.4,2.7),materials.sand,[0,1.7,0]),
    mesh(new THREE.ConeGeometry(3.5,1.5,4),materials.leaf,[0,3.55,0],[0,Math.PI/4,0]),
    mesh(new THREE.BoxGeometry(2.4,1.15,.08),materials.dark,[0,1.9,1.39]),
  )
  world.add(outpost)

  const light=new THREE.SpotLight('#e7d5ac',8,42,.5,.75)
  light.position.set(-8,16,mapJourneyZ(-101))
  light.target.position.set(0,0,mapJourneyZ(-114))
  world.add(light,light.target)

  world.updateMatrixWorld(true)
  const routeClearance=obstacles.reduce((minimum,obstacle)=>Math.min(minimum,obstacleClearance(route,obstacle)),Infinity)
  const sightlineClearance=sightlineTrees.reduce((minimum,tree)=>{
    const {center,radius}=obstacleFootprint(tree)
    return Math.min(
      minimum,
      ...sightlines.map(({start,end})=>distanceToSegmentXZ(center.x,center.z,start,end)-radius),
    )
  },Infinity)
  world.userData={
    route,
    heightAt,
    routeClearance,
    routeObstacles:obstacles,
    sightlineClearance,
    counts:{trees:treeCount,undergrowth:undergrowthCount+bankCoverCount+shrubCount},
    materialDetail:{leafVariants:forestMaterials.leaf.length,barkVariants:2},
    forestLanding,
    wildlife,
    copyAnchor:new THREE.Vector3(-7,3,mapJourneyZ(-128)),
  }
  return world
}
