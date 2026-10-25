import * as THREE from 'three'
import { mesh } from './primitives'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createEnvironmentMaterial,createLandscapeMaterial,createFoliageGeometry,createFoliageMaterial,createCanopyTexture,createRippleNormalMap,projectGroundUV } from './environmentSurface'
import { LANDMARKS,smootherstep } from './terrain'
import { createForestRoute,sampleForestGroundHeight,sampleLandingGroundHeight,getLandingTerrainX,matchLandingBoundaryNormals } from './forestTerrain'
import { createRiverRoute,sampleRiverCrossSection,sampleRiverSurface,RIVER_LEVEL,RIVER_SURFACE_START_Z,RIVER_SURFACE_END_Z } from './riverConfig'
import { attachNaturalReflection } from './naturalWater'
import { mapJourneyZ } from './journeySpatial'
import { createForestTreeGeometry } from './forestGeometry'

const named=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const deterministic=(index,salt=0)=>{
  const value=Math.sin((index+1)*91.733+(salt+1)*37.119)*43758.5453
  return value-Math.floor(value)
}

const sampleFrame=(curve,t)=>{
  const point=curve.getPointAt(t)
  const tangent=curve.getTangentAt(THREE.MathUtils.clamp(t,0,1)).normalize()
  const lateral=new THREE.Vector3(tangent.z,0,-tangent.x).normalize()
  return{point,tangent,lateral}
}

const createRiverSurfaceGeometry=quality=>{
  const segments=quality==='mobile'?192:288,crossSectionSegments=quality==='mobile'?16:24
  const positions=[],colors=[],depths=[],shoreDistances=[],indices=[]
  const deep=new THREE.Color('#35565c'),shallow=new THREE.Color('#809996'),color=new THREE.Color()
  for(let row=0;row<=segments;row++){
    const z=THREE.MathUtils.lerp(RIVER_SURFACE_START_Z,RIVER_SURFACE_END_Z,row/segments)
    const section=sampleRiverCrossSection(z)
    for(let column=0;column<=crossSectionSegments;column++){
      // A small buried margin lets the sculpted bank define the actual shoreline.
      const x=THREE.MathUtils.lerp(section.leftX-.45,section.rightX+.45,column/crossSectionSegments)
      const river=sampleRiverSurface(x,z)
      positions.push(x,RIVER_LEVEL,z)
      color.copy(deep).lerp(shallow,(1-smootherstep(.08,1.5,river.depth))*.72)
      colors.push(color.r,color.g,color.b)
      depths.push(river.depth)
      shoreDistances.push(river.edgeDistance)
    }
    if(row<segments){
      const columns=crossSectionSegments+1
      for(let column=0;column<crossSectionSegments;column++){
        const a=row*columns+column,b=a+1,c=a+columns,d=c+1
        indices.push(a,b,c,b,d,c)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setAttribute('waterDepth',new THREE.Float32BufferAttribute(depths,1))
  geometry.setAttribute('shoreDistance',new THREE.Float32BufferAttribute(shoreDistances,1))
  geometry.setIndex(indices)
  geometry.userData={routeSegments:segments,crossSectionSegments,crossSectionColumns:crossSectionSegments+1,monotonicRiverRows:true}
  geometry.computeVertexNormals()
  return projectGroundUV(geometry,2.4)
}

const createBasinGeometry=(forestRoute,quality)=>{
  const frontZ=LANDMARKS.forestLanding[2]
  const rearZ=RIVER_SURFACE_START_Z+2
  const geometry=new THREE.PlaneGeometry(160,rearZ-frontZ,quality==='mobile'?80:112,quality==='mobile'?160:224)
  geometry.rotateX(-Math.PI/2)
  geometry.translate(0,0,(frontZ+rearZ)/2)
  const position=geometry.getAttribute('position')
  const colors=[]
  const dark=new THREE.Color('#494b36')
  const moss=new THREE.Color('#65694b')
  const wetMud=new THREE.Color('#494c38'),gravel=new THREE.Color('#8d856b')
  const forestEarth=new THREE.Color('#676147'),forestMoss=new THREE.Color('#596443')
  const forestColor=new THREE.Color()
  const color=new THREE.Color()
  for(let index=0;index<position.count;index+=1){
    const depth=(rearZ-position.getZ(index))/(rearZ-frontZ)
    const inletStart=mapJourneyZ(-76)
    const z=depth<=.55?THREE.MathUtils.lerp(rearZ,inletStart,depth/.55):THREE.MathUtils.lerp(inletStart,frontZ,(depth-.55)/.45)
    const shore=smootherstep(-inletStart,-frontZ,-z)
    const mainFocus=THREE.MathUtils.lerp(22,18,smootherstep(-mapJourneyZ(-70),-inletStart,-z))
    const x=getLandingTerrainX(position.getX(index)/80,80,THREE.MathUtils.lerp(mainFocus,8,shore))
    const height=sampleLandingGroundHeight(forestRoute,x,z)
    position.setXYZ(index,x,height,z)
    const variation=Math.sin(x*.36+(z+61.5)*.19)*.5+Math.cos((z+61.5)*.31-x*.14)*.5
    color.copy(dark).lerp(moss,.36+variation*.16)
    const river=sampleRiverSurface(x,z)
    color.lerp(wetMud,(1-smootherstep(-.1,.28,height))*.55)
    color.lerp(gravel,(1-smootherstep(-.6,2.2,Math.abs(river.edgeDistance)))*.3+river.barWeight*.26)
    forestColor.copy(forestEarth).lerp(forestMoss,.5+Math.sin(x*.23+Math.sin(z*.17))*Math.cos(z*.27-x*.11)*.35)
    color.lerp(forestColor,shore)
    colors.push(color.r,color.g,color.b)
  }
  position.needsUpdate=true
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.userData.continuousBasin=true
  geometry.computeVertexNormals()
  matchLandingBoundaryNormals(geometry,forestRoute)
  return projectGroundUV(geometry,2)
}

const riverBankCurve=(side,startZ,endZ,inset=0)=>new THREE.CatmullRomCurve3(
  Array.from({length:12},(_,index)=>{
    const z=THREE.MathUtils.lerp(startZ,endZ,index/11),section=sampleRiverCrossSection(z)
    return new THREE.Vector3((side<0?section.leftX:section.rightX)-side*inset,.055,z)
  }),
)

const createLanding=(name,route,t,m)=>{
  const {point,tangent}=sampleFrame(route,t)
  const landing=named(name)
  landing.position.copy(point)
  landing.rotation.y=Math.atan2(tangent.x,tangent.z)
  const deck=named(name==='mountain-water-landing'?'boat-jetty':'forest-jetty')
  deck.position.set(0,.18,0)
  for(let index=0;index<10;index++){
    const length=3.12+deterministic(index,22)*.13
    const plank=mesh(new THREE.BoxGeometry(.343,.16,length),m.wood,[(index-4.5)*.356,0,(deterministic(index,23)-.5)*.045])
    plank.rotation.y=(deterministic(index,24)-.5)*.008
    deck.add(plank)
  }
  ;[-1.65,1.65].forEach(x=>[-1.35,1.35].forEach(z=>{
    deck.add(mesh(new THREE.CylinderGeometry(.055,.075,1.25,8),m.wood,[x,-.35,z]))
  }))
  landing.add(deck)
  return landing
}

const addShoreInstances=(parent,name,geometry,material,count,forestRoute,{minOffset=0,maxOffset=1.5,minScale=.1,maxScale=.3,heightScale=.5,groundLift=.38,salt=0}={})=>{
  const instances=new THREE.InstancedMesh(geometry,material,count)
  instances.name=name
  const dummy=new THREE.Object3D()
  for(let index=0;index<count;index++){
    const z=THREE.MathUtils.lerp(mapJourneyZ(-38),mapJourneyZ(-83),deterministic(index,salt+1))
    const side=index%2?-1:1,section=sampleRiverCrossSection(z)
    const offset=THREE.MathUtils.lerp(minOffset,maxOffset,deterministic(index,salt+2))
    const x=(side<0?section.leftX:section.rightX)+side*offset
    const scale=THREE.MathUtils.lerp(minScale,maxScale,deterministic(index,salt+3))
    dummy.position.set(x,sampleLandingGroundHeight(forestRoute,x,z)+scale*heightScale*groundLift,z)
    dummy.rotation.set((deterministic(index,salt+4)-.5)*.35,deterministic(index,salt+5)*Math.PI*2,(deterministic(index,salt+6)-.5)*.22)
    dummy.scale.set(scale*(.8+deterministic(index,salt+7)*.6),scale*heightScale,scale)
    dummy.updateMatrix()
    instances.setMatrixAt(index,dummy.matrix)
  }
  instances.instanceMatrix.needsUpdate=true
  instances.castShadow=true
  instances.receiveShadow=true
  parent.add(instances)
  return instances
}

const rememberWaveBase=layer=>{
  const position=layer.geometry.attributes.position
  layer.userData.baseY=new Float32Array(position.count)
  const damp=new Float32Array(position.count),dx=new Float32Array(position.count),dz=new Float32Array(position.count)
  const dampingAt=(x,z)=>smootherstep(.04,.6,sampleRiverSurface(x,z).depth)
  const step=.05
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index),z=position.getZ(index)
    layer.userData.baseY[index]=position.getY(index)
    damp[index]=dampingAt(x,z)
    dx[index]=(dampingAt(x+step,z)-dampingAt(x-step,z))/(2*step)
    dz[index]=(dampingAt(x,z+step)-dampingAt(x,z-step))/(2*step)
  }
  layer.userData.waveShore={damp,dx,dz}
  return layer
}

const animateWaveVertices=(layer,elapsed,frequency,amplitude,phase)=>{
  const position=layer.geometry.attributes.position
  const normals=layer.geometry.getAttribute('normal')
  const {damp,dx,dz}=layer.userData.waveShore
  for(let index=0;index<position.count;index+=1){
    const baseY=layer.userData.baseY[index]
    const first=elapsed*frequency+position.getX(index)*.31+position.getZ(index)*.17+phase
    const second=elapsed*frequency*.61-position.getZ(index)*.23+position.getX(index)*.12
    const wave=Math.sin(first)*amplitude+Math.cos(second)*amplitude*.42
    position.setY(index,baseY+damp[index]*wave)
    const slopeX=damp[index]*(Math.cos(first)*amplitude*.31-Math.sin(second)*amplitude*.42*.12)+dx[index]*wave
    const slopeZ=damp[index]*(Math.cos(first)*amplitude*.17+Math.sin(second)*amplitude*.42*.23)+dz[index]*wave
    const inverseLength=1/Math.hypot(slopeX,1,slopeZ)
    normals.setXYZ(index,-slopeX*inverseLength,inverseLength,-slopeZ*inverseLength)
  }
  position.needsUpdate=true
  normals.needsUpdate=true
}

const addRiverCurrent=material=>{
  const time={value:0}
  material.userData.currentTime=time
  material.onBeforeCompile=shader=>{
    shader.uniforms.riverCurrentTime=time
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute float waterDepth;
      varying float vRiverDepth;
      varying vec2 vRiverFlowPosition;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vRiverDepth=waterDepth;
        vRiverFlowPosition=position.xz;`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float riverCurrentTime;
      varying float vRiverDepth;
      varying vec2 vRiverFlowPosition;
      float currentHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float currentNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(currentHash(i),currentHash(i+vec2(1,0)),f.x),
          mix(currentHash(i+vec2(0,1)),currentHash(i+vec2(1,1)),f.x),f.y);
      }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 flow=vec2(vRiverFlowPosition.x,vRiverFlowPosition.y+riverCurrentTime*.42);
        float eddy=currentNoise(flow*.22);
        float streak=currentNoise(vec2(flow.x*2.1+eddy*.9,flow.y*.18));
        float broken=currentNoise(flow*.72+vec2(eddy,riverCurrentTime*.025));
        float current=smoothstep(.57,.88,streak)*smoothstep(.26,.68,broken);
        float shallows=1.0-smoothstep(.12,1.4,vRiverDepth);
        diffuseColor.rgb*=.96+eddy*.09;
        diffuseColor.rgb+=vec3(.045,.075,.07)*current*(.35+shallows*.65);
      `)
  }
  material.customProgramCacheKey=()=> 'river-current-v1'
  return material
}

const addScenicReflection=material=>{
  material.userData.reflectionMode='environment-fresnel'
  material.envMapIntensity=1.05
  material.normalMap=createRippleNormalMap()
  material.normalScale=new THREE.Vector2(.28,.28)
  return material
}

const createForestSightline=(m,route,quality,forestRoute)=>{
  const forest=named('distant-forest-silhouette')
  const count=quality==='mobile'?9:15
  const forestLandingPoint=route.getPointAt(1)
  const heightAt=(x,z)=>sampleForestGroundHeight(forestRoute,x,z)
  forest.userData.groundOwner='forest-ground'
  ;[
    {z:-4,color:'#357b40',scale:.82},
    {z:-9,color:'#438346',scale:1},
    {z:-14,color:'#4d8c4d',scale:1.12},
  ].forEach((bandConfig,bandIndex)=>{
    const band=named(`forest-silhouette-band-${bandIndex+1}`)
    const material=bandIndex===0?m.foliage:createFoliageMaterial(bandConfig.color,m.foliage.map)
    if(!material.map?.userData.managedByNatureAssets&&!material.map?.userData.photographed) material.color.set(bandConfig.color)
    for(let index=0;index<count;index+=1){
      const side=(index+bandIndex)%2?-1:1
      const height=(1.45+(index%4)*.28)*bandConfig.scale
      const radius=.72+(index%3)*.12
      const x=side*(16+deterministic(index,bandIndex+40)*12)
      const z=forestLandingPoint.z+bandConfig.z-deterministic(index,bandIndex+50)*3
      const tree=named(`forest-proxy-tree-${bandIndex}-${index}`)
      tree.position.set(x,heightAt(x,z)-.09,z)
      const trunkHeight=height+.12
      const trunk=mesh(
        new THREE.CylinderGeometry(.09*bandConfig.scale,.16*bandConfig.scale,trunkHeight,7),
        m.wood,
        [0,trunkHeight/2,0],
      )
      trunk.name='distant-forest-trunk'
      const crown=mesh(
        createFoliageGeometry({seed:index+bandIndex*61,variant:index%6,scale:radius*.7,leaves:quality==='mobile'?160:260}),
        material,
        [0,height,0],
      )
      crown.name='distant-forest-crown'
      crown.scale.set(
        (.88+(index%4)*.1)*bandConfig.scale,
        (.82+(index%3)*.12)*bandConfig.scale,
        (.72+((index+1)%4)*.08)*bandConfig.scale,
      )
      tree.add(trunk,crown)
      band.add(tree)
    }
    forest.add(band)
  })
  return forest
}

const createRiverWoodland=(materials,quality,forestRoute)=>{
  const woodland=named('river-bank-woodland')
  const count=quality==='mobile'?18:34
  const transform=new THREE.Object3D()
  const placements=[]
  for(let variant=0;variant<3;variant++){
    const geometry=createForestTreeGeometry(variant*2,quality,{distant:true})
    const trunks=new THREE.InstancedMesh(geometry.skeleton,materials.wood,count)
    const leaves=new THREE.InstancedMesh(geometry.crown,materials.foliage,count)
    trunks.name=`river-woodland-trunks-${variant}`
    leaves.name=`river-woodland-crowns-${variant}`
    for(let index=0;index<count;index++){
      const key=index+variant*count
      const z=THREE.MathUtils.lerp(mapJourneyZ(-40),mapJourneyZ(-82),deterministic(key,220))
      const section=sampleRiverCrossSection(z)
      const side=key%2?-1:1
      const x=(side<0?section.leftX:section.rightX)+side*(4+deterministic(key,221)*12)
      transform.position.set(x,sampleLandingGroundHeight(forestRoute,x,z),z)
      const scale=.65+deterministic(key,222)*.55
      transform.scale.set(scale*(.9+deterministic(key,223)*.2),scale,scale)
      transform.rotation.y=deterministic(key,224)*Math.PI*2
      transform.updateMatrix()
      trunks.setMatrixAt(index,transform.matrix)
      leaves.setMatrixAt(index,transform.matrix)
      placements.push({x,z,scale})
    }
    for(const object of [trunks,leaves]){
      object.receiveShadow=true
      object.computeBoundingBox()
      object.computeBoundingSphere()
      woodland.add(object)
    }
  }
  woodland.userData.placements=placements
  return woodland
}

export function createWaterWorld(m,quality='desktop'){
  const world=named('water-world')
  m={...m,
    wood:createEnvironmentMaterial('#786b55','wood'),
    leaf2:new THREE.MeshStandardMaterial({color:'#747c50',roughness:.97}),
    foliage:createFoliageMaterial('#39883e',createCanopyTexture()),
  }
  const route=createRiverRoute()
  const forestRoute=createForestRoute()
  const basin=mesh(createBasinGeometry(forestRoute,quality),createLandscapeMaterial())
  basin.name='water-basin-ground'
  basin.receiveShadow=true
  world.add(basin)

  const surfaceMaterial=addRiverCurrent(addScenicReflection(new THREE.MeshPhysicalMaterial({
    color:'#ffffff',roughness:.17,metalness:0,transmission:0,ior:1.333,
    clearcoat:.2,clearcoatRoughness:.18,transparent:false,opacity:1,
    vertexColors:true,side:THREE.DoubleSide,
  })))
  const water=rememberWaveBase(mesh(createRiverSurfaceGeometry(quality),surfaceMaterial))
  attachNaturalReflection(water,{quality,level:RIVER_LEVEL})
  water.name='reflective-water'
  water.receiveShadow=true
  world.add(water)

  // The bank is the exposed part of the continuous basin, not an overlapping ribbon.
  const shoreline=named('water-shoreline'),banks=named('curved-river-banks')
  ;['left-river-bank','right-river-bank'].forEach(name=>{
    const bank=named(name)
    bank.userData.surfaceOwner='water-basin-ground'
    banks.add(bank)
  })
  shoreline.add(banks)
  world.add(shoreline)

  const shoreDetail=named('water-shore-detail')
  ;['#77796b','#8a826c','#666b53'].forEach((color,index)=>{
    addShoreInstances(shoreDetail,`shore-gravel-${index}`,new THREE.DodecahedronGeometry(1,0),
      createEnvironmentMaterial(color,'rock'),quality==='mobile'?42:82,forestRoute,
      {minOffset:-.18,maxOffset:2.1,minScale:.055,maxScale:.23,heightScale:.42,salt:40+index*10})
  })
  world.add(shoreDetail)

  const rocks=named('water-rocks')
  addShoreInstances(rocks,'river-bank-boulders',new THREE.DodecahedronGeometry(1,1),
    createEnvironmentMaterial('#676e60','rock',{roughness:.64,bumpScale:.08}),
    quality==='mobile'?22:42,forestRoute,
    {minOffset:-.65,maxOffset:.95,minScale:.28,maxScale:.74,heightScale:.58,salt:80})
  world.add(rocks)

  const reeds=named('water-reeds')
  const stems=Array.from({length:5},(_,index)=>{
    const height=.6+(index%3)*.2
    const stem=new THREE.CylinderGeometry(.008,.02,height,5)
    stem.rotateZ((index-2)*.09)
    stem.translate((index-2)*.07,height/2,(index%2)*.09)
    return stem
  })
  const reedGeometry=mergeGeometries(stems,false)
  stems.forEach(stem=>stem.dispose())
  addShoreInstances(reeds,'river-reed-clusters',reedGeometry,m.leaf2,quality==='mobile'?88:164,forestRoute,
    {minOffset:.55,maxOffset:2.3,minScale:.8,maxScale:1.4,heightScale:1,groundLift:-.035,salt:110})
  world.add(reeds)

  const foam=named('water-foam-accents')
  ;[-1,1].forEach(side=>{
    for(let patch=0;patch<3;patch++){
      const start=mapJourneyZ(-46-patch*11+(side>0?2:0))
      const material=new THREE.MeshBasicMaterial({color:'#c2c9b4',transparent:true,opacity:.16,depthWrite:false})
      foam.add(mesh(new THREE.TubeGeometry(riverBankCurve(side,start,start-1.1,.34),12,.009,4,false),material))
    }
  })
  world.add(foam)

  const mountainLanding=createLanding('mountain-water-landing',route,0,m)
  const forestLanding=createLanding('forest-water-landing',route,1,m)
  world.add(mountainLanding,forestLanding)

  const forestSightline=createForestSightline(m,route,quality,forestRoute)
  world.add(forestSightline)
  world.add(createRiverWoodland(m,quality,forestRoute))

  const sun=new THREE.DirectionalLight('#e7ddc9',.65)
  sun.position.set(-8,12,6)
  world.add(sun)
  world.userData={
    route,
    water,
    wake:null,
    mountainLanding,
    forestLanding,
    surfaceMaterials:[surfaceMaterial],
    riverSampler:sampleRiverSurface,
    forestSightline,
    copyAnchor:mountainLanding.position.clone().add(new THREE.Vector3(-5,2,-2)),
  }
  return world
}

export function updateWaterWorld(world,elapsed,boat){
  const {water}=world.userData
  animateWaveVertices(water,elapsed,.76,.035,0)
  water.material.userData.currentTime.value=elapsed
  water.material.normalMap.offset.set(elapsed*.006,elapsed*.009)
  water.position.y=.004+Math.sin(elapsed*1.11)*.003
  const foam=world.getObjectByName('water-foam-accents')
  if(foam) foam.children.forEach((accent,index)=>{
    accent.material.opacity=.34+.16*Math.sin(elapsed*(1.2+(index%3)*.17)+index*.8)
  })
  if(boat){
    const boatWake=boat.getObjectByName('boat-wake')
    if(boatWake) world.userData.wake=boatWake
  }
}
