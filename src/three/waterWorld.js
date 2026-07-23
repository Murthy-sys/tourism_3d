import * as THREE from 'three'
import { createTree,mesh } from './primitives'
import { LANDMARKS } from './terrain'

const named=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const smooth01=value=>{
  const t=THREE.MathUtils.clamp(value,0,1)
  return t*t*(3-2*t)
}

const waterHalfWidth=t=>{
  const inlet=smooth01((t-.58)/.42)
  return 4.85+Math.sin(t*Math.PI*2.4)*.25+Math.sin(t*Math.PI*5.1)*.1-inlet*2
}

const sampleFrame=(curve,t)=>{
  const point=curve.getPointAt(t)
  const tangent=curve.getTangentAt(THREE.MathUtils.clamp(t,0,1)).normalize()
  const lateral=new THREE.Vector3(tangent.z,0,-tangent.x).normalize()
  return{point,tangent,lateral}
}

const createRibbonGeometry=(curve,segments,halfWidthAt,y=0,crossSectionSegments=6)=>{
  const positions=[],colors=[],indices=[]
  const deep=new THREE.Color('#0a5868'),light=new THREE.Color('#43a7a9'),color=new THREE.Color()
  for(let index=0;index<=segments;index+=1){
    const t=index/segments,{point,lateral}=sampleFrame(curve,t),halfWidth=halfWidthAt(t)
    for(let column=0;column<=crossSectionSegments;column+=1){
      const side=column/crossSectionSegments*2-1
      positions.push(point.x+lateral.x*halfWidth*side,y,point.z+lateral.z*halfWidth*side)
      color.copy(deep).lerp(light,.08+Math.abs(side)*.82+.08*Math.sin(t*Math.PI))
      colors.push(color.r,color.g,color.b)
    }
    if(index<segments){
      const columns=crossSectionSegments+1
      for(let column=0;column<crossSectionSegments;column+=1){
        const offset=index*columns+column,next=offset+columns
        indices.push(offset,next,offset+1,offset+1,next,next+1)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.userData={
    routeSegments:segments,
    crossSectionSegments,
    crossSectionColumns:crossSectionSegments+1,
  }
  geometry.computeVertexNormals()
  return geometry
}

const createBankGeometry=(curve,segments,side)=>{
  const positions=[],colors=[],indices=[]
  const wet=new THREE.Color('#273f37'),dry=new THREE.Color('#566044'),color=new THREE.Color()
  for(let index=0;index<=segments;index+=1){
    const t=index/segments,{point,lateral}=sampleFrame(curve,t)
    const inner=waterHalfWidth(t)-.18
    const outer=inner+1.45+Math.sin(index*1.73+side)*.2+Math.sin(index*.43)*.12
    ;[inner,outer].forEach((distance,column)=>{
      positions.push(
        point.x+lateral.x*distance*side,
        column===0?.07:.2+Math.sin(index*.91+side)*.08,
        point.z+lateral.z*distance*side,
      )
      color.copy(wet).lerp(dry,column*.78)
      colors.push(color.r,color.g,color.b)
    })
    if(index<segments){
      const offset=index*2
      if(side<0) indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2)
      else indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3)
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const createEdgeRibbonGeometry=(curve,segments,side)=>{
  const positions=[],indices=[]
  for(let index=0;index<=segments;index+=1){
    const t=index/segments,{point,lateral}=sampleFrame(curve,t)
    const distances=[waterHalfWidth(t)-1.02,waterHalfWidth(t)-.08]
    distances.forEach(distance=>positions.push(
      point.x+lateral.x*distance*side,
      .075,
      point.z+lateral.z*distance*side,
    ))
    if(index<segments){
      const offset=index*2
      if(side<0) indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2)
      else indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3)
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.userData.edgeRibbon=true
  geometry.computeVertexNormals()
  return geometry
}

const createBasinGeometry=()=>{
  const geometry=new THREE.PlaneGeometry(58,76,36,48)
  geometry.rotateX(-Math.PI/2)
  const position=geometry.getAttribute('position')
  const colors=[]
  const dark=new THREE.Color('#283a31')
  const moss=new THREE.Color('#4f5b3c')
  const color=new THREE.Color()
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index)
    const z=position.getZ(index)
    const variation=Math.sin(x*.36+z*.19)*.5+Math.cos(z*.31-x*.14)*.5
    position.setY(index,-.37+variation*.045)
    color.copy(dark).lerp(moss,.36+variation*.16)
    colors.push(color.r,color.g,color.b)
  }
  position.needsUpdate=true
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.userData.continuousBasin=true
  geometry.computeVertexNormals()
  return geometry
}

const offsetCurve=(route,offset,start=0,end=1,points=28)=>new THREE.CatmullRomCurve3(
  Array.from({length:points},(_,index)=>{
    const t=THREE.MathUtils.lerp(start,end,index/(points-1))
    const {point,lateral}=sampleFrame(route,t)
    return point.clone().addScaledVector(lateral,offset(t))
  }),
)

const createLanding=(name,route,t,m)=>{
  const {point,tangent}=sampleFrame(route,t)
  const landing=named(name)
  landing.position.copy(point)
  landing.rotation.y=Math.atan2(tangent.x,tangent.z)
  const deck=named(name==='mountain-water-landing'?'boat-jetty':'forest-jetty')
  deck.position.set(0,.18,0)
  for(let index=-2;index<=2;index+=1){
    const plank=mesh(new THREE.BoxGeometry(.7,.16,3.2),m.wood,[index*.72,0,0])
    plank.rotation.y=(index%2)*.018
    deck.add(plank)
  }
  ;[-1.65,1.65].forEach(x=>[-1.35,1.35].forEach(z=>{
    deck.add(mesh(new THREE.CylinderGeometry(.055,.075,1.25,8),m.wood,[x,-.35,z]))
  }))
  landing.add(deck)
  return landing
}

const rememberWaveBase=layer=>{
  const position=layer.geometry.attributes.position
  layer.userData.baseY=new Float32Array(position.count)
  for(let index=0;index<position.count;index+=1) layer.userData.baseY[index]=position.getY(index)
  return layer
}

const animateWaveVertices=(layer,elapsed,frequency,amplitude,phase)=>{
  const position=layer.geometry.attributes.position
  const columns=layer.geometry.userData.crossSectionColumns||2
  for(let index=0;index<position.count;index+=1){
    const baseY=layer.userData.baseY[index]
    const across=(index%columns)/(columns-1)*2-1
    position.setY(index,baseY+
      Math.sin(elapsed*frequency+position.getX(index)*.31+position.getZ(index)*.17+across*4.1+phase)*amplitude+
      Math.cos(elapsed*frequency*.61-position.getZ(index)*.23-across*2.4)*amplitude*.42)
  }
  position.needsUpdate=true
  layer.geometry.computeVertexNormals()
}

const addScenicReflection=material=>{
  material.userData.reflectionMode='fresnel-sky-terrain'
  material.onBeforeCompile=shader=>{
    shader.uniforms.reflectedSkyColor={value:new THREE.Color('#b9e6e0')}
    shader.uniforms.reflectedTerrainColor={value:new THREE.Color('#244f42')}
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
uniform vec3 reflectedSkyColor;
uniform vec3 reflectedTerrainColor;`)
      .replace('#include <opaque_fragment>',`
float reflectionFresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
vec3 scenicReflection = mix(reflectedTerrainColor, reflectedSkyColor, clamp(normal.y * 0.5 + 0.5, 0.0, 1.0));
outgoingLight = mix(outgoingLight, scenicReflection, 0.12 + reflectionFresnel * 0.38);
#include <opaque_fragment>`)
  }
  material.customProgramCacheKey=()=>material.userData.reflectionMode
  return material
}

const createForestSightline=(m,route,quality)=>{
  const forest=named('distant-forest-silhouette')
  const count=quality==='mobile'?9:15
  const forestLandingPoint=route.getPointAt(1)
  const sightlineGround=mesh(
    new THREE.PlaneGeometry(34,19,16,10),
    new THREE.MeshStandardMaterial({color:'#314331',roughness:1}),
    [forestLandingPoint.x,-.22,forestLandingPoint.z-10],
    [-Math.PI/2,0,0],
  )
  sightlineGround.name='forest-sightline-ground'
  sightlineGround.receiveShadow=true
  forest.add(sightlineGround)
  ;[
    {offset:-5,z:-8,color:'#173b32',scale:.82},
    {offset:0,z:-11,color:'#204b3b',scale:1},
    {offset:5,z:-14,color:'#2b5b43',scale:1.12},
  ].forEach((bandConfig,bandIndex)=>{
    const band=named(`forest-silhouette-band-${bandIndex+1}`)
    const material=new THREE.MeshStandardMaterial({color:bandConfig.color,roughness:.94})
    for(let index=0;index<count;index+=1){
      const t=index/(count-1),{point,lateral}=sampleFrame(route,1)
      const spread=(t-.5)*22+bandConfig.offset+Math.sin(index*1.73+bandIndex)*.58
      const height=(1.45+(index%4)*.28)*bandConfig.scale
      const radius=.72+(index%3)*.12
      const x=point.x+lateral.x*spread
      const z=point.z+lateral.z*spread+bandConfig.z+Math.sin(index*.91+bandIndex)*.7
      const trunkHeight=Math.max(.9,height-radius*.28)
      const trunk=mesh(
        new THREE.CylinderGeometry(.09*bandConfig.scale,.16*bandConfig.scale,trunkHeight,7),
        m.wood,
        [x,trunkHeight/2,z],
      )
      trunk.name='distant-forest-trunk'
      const crown=mesh(
        index%2
          ?new THREE.IcosahedronGeometry(radius,2)
          :new THREE.DodecahedronGeometry(radius,1),
        material,
        [x,height+bandIndex*.35,z],
      )
      crown.name='distant-forest-crown'
      crown.scale.set(
        (.88+(index%4)*.1)*bandConfig.scale,
        (.82+(index%3)*.12)*bandConfig.scale,
        (.72+((index+1)%4)*.08)*bandConfig.scale,
      )
      band.add(trunk,crown)
    }
    forest.add(band)
  })
  for(let index=0;index<(quality==='mobile'?5:10);index+=1){
    forest.add(createTree(
      m,
      forestLandingPoint.x-7.5+index*1.65+Math.sin(index*1.4)*.35,
      forestLandingPoint.z-5-(index%3)*1.5,
      .48+(index%4)*.06,
    ))
  }
  return forest
}

export function createWaterWorld(m,quality='desktop'){
  const world=named('water-world')
  const route=new THREE.CatmullRomCurve3([
    new THREE.Vector3(...LANDMARKS.mountainLanding),
    new THREE.Vector3(6.4,.2,-45),
    new THREE.Vector3(-4.8,.18,-58),
    new THREE.Vector3(4.2,.2,-72),
    new THREE.Vector3(...LANDMARKS.forestLanding),
  ],false,'catmullrom',.42)
  const segments=quality==='mobile'?40:76

  const basin=mesh(
    createBasinGeometry(),
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),
    [0,0,-60],
  )
  basin.name='water-basin-ground'
  basin.receiveShadow=true
  world.add(basin)

  const depthMaterial=new THREE.MeshStandardMaterial({
    color:'#063b4b',
    roughness:.78,
    metalness:.04,
    vertexColors:true,
  })
  const depth=mesh(createRibbonGeometry(route,segments,t=>waterHalfWidth(t)+.28,-.28),depthMaterial)
  depth.name='water-depth-layer'
  depth.receiveShadow=true
  world.add(depth)

  const surfaceMaterial=addScenicReflection(new THREE.MeshPhysicalMaterial({
    color:'#ffffff',
    roughness:.18,
    metalness:.05,
    transmission:.12,
    clearcoat:1,
    clearcoatRoughness:.1,
    transparent:true,
    opacity:.88,
    vertexColors:true,
    side:THREE.DoubleSide,
  }))
  const water=rememberWaveBase(mesh(createRibbonGeometry(route,segments,waterHalfWidth,.01),surfaceMaterial))
  water.name='reflective-water'
  water.receiveShadow=true
  world.add(water)

  const reflectionMaterial=new THREE.MeshPhysicalMaterial({
    color:'#a8e7df',
    roughness:.12,
    metalness:.16,
    transmission:.04,
    clearcoat:1,
    transparent:true,
    opacity:.2,
    vertexColors:true,
    depthWrite:false,
    blending:THREE.NormalBlending,
  })
  const reflection=rememberWaveBase(mesh(createRibbonGeometry(route,segments,t=>waterHalfWidth(t)*.84,.055),reflectionMaterial))
  reflection.name='water-reflection-layer'
  reflection.renderOrder=2
  world.add(reflection)

  const shallows=named('water-shallows')
  const shallowsMaterial=new THREE.MeshPhysicalMaterial({
    color:'#91d5bd',
    roughness:.3,
    metalness:.02,
    transmission:.08,
    clearcoat:.62,
    transparent:true,
    opacity:.46,
    depthWrite:false,
  })
  ;[-1,1].forEach(side=>{
    const shallow=mesh(
      createEdgeRibbonGeometry(route,segments,side),
      shallowsMaterial,
    )
    shallow.name=side<0?'left-water-shallows':'right-water-shallows'
    shallows.add(shallow)
  })
  world.add(shallows)

  const banks=named('curved-river-banks')
  banks.add(
    mesh(createBankGeometry(route,segments,-1),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96})),
    mesh(createBankGeometry(route,segments,1),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96})),
  )
  banks.children[0].name='left-river-bank'
  banks.children[1].name='right-river-bank'
  const shoreline=named('water-shoreline')
  shoreline.add(banks)
  world.add(shoreline)

  const bankShadows=named('water-bank-shadows')
  const shadowMaterial=new THREE.MeshBasicMaterial({color:'#092f35',transparent:true,opacity:.42,depthWrite:false})
  ;[-1,1].forEach(side=>{
    const shadowCurve=offsetCurve(route,t=>side*(waterHalfWidth(t)-.05))
    bankShadows.add(mesh(new THREE.TubeGeometry(shadowCurve,segments,.18,6,false),shadowMaterial))
  })
  world.add(bankShadows)

  const foam=named('water-foam-accents')
  const createFoamMaterial=()=>new THREE.MeshBasicMaterial({color:'#d9f4e8',transparent:true,opacity:.5,depthWrite:false})
  ;[-1,1].forEach(side=>{
    const foamCurve=offsetCurve(route,t=>side*(waterHalfWidth(t)-.42),.03,.97,24)
    foam.add(mesh(new THREE.TubeGeometry(foamCurve,segments,.025,5,false),createFoamMaterial()))
  })
  for(let index=0;index<(quality==='mobile'?5:11);index+=1){
    const t=.08+index/(quality==='mobile'?6:12)*.84,{point,lateral}=sampleFrame(route,t)
    const ripple=mesh(new THREE.RingGeometry(.2,.26,18),createFoamMaterial(),[
      point.x+lateral.x*(index%2?2.5:-2.8),
      .11,
      point.z+lateral.z*(index%2?2.5:-2.8),
    ],[-Math.PI/2,0,index*.37])
    foam.add(ripple)
  }
  world.add(foam)

  const rocks=named('water-rocks')
  const wetStoneMaterial=new THREE.MeshPhysicalMaterial({color:'#304c48',roughness:.36,metalness:.08,clearcoat:.68})
  for(let index=0;index<(quality==='mobile'?8:18);index+=1){
    const t=.03+index/(quality==='mobile'?8:18)*.94,{point,lateral}=sampleFrame(route,t)
    const side=index%2?-1:1,distance=waterHalfWidth(t)-.32+(index%3)*.42
    const rock=mesh(
      new THREE.DodecahedronGeometry(.34+(index%4)*.13,1),
      wetStoneMaterial,
      [point.x+lateral.x*distance*side,.18,point.z+lateral.z*distance*side],
    )
    rock.scale.y=.55
    rocks.add(rock)
  }
  world.add(rocks)

  const reeds=named('water-reeds')
  for(let index=0;index<(quality==='mobile'?16:38);index+=1){
    const t=.04+index/(quality==='mobile'?16:38)*.92,{point,lateral}=sampleFrame(route,t)
    const side=index%2?-1:1,distance=waterHalfWidth(t)+.35+(index%4)*.17
    const reed=mesh(
      new THREE.CylinderGeometry(.018,.027,.72+(index%4)*.17,5),
      m.leaf2,
      [point.x+lateral.x*distance*side,.4,point.z+lateral.z*distance*side],
    )
    reed.rotation.z=side*(.04+(index%3)*.025)
    reeds.add(reed)
  }
  world.add(reeds)

  const mountainLanding=createLanding('mountain-water-landing',route,0,m)
  const forestLanding=createLanding('forest-water-landing',route,1,m)
  world.add(mountainLanding,forestLanding)

  const forestSightline=createForestSightline(m,route,quality)
  world.add(forestSightline)

  const sun=new THREE.DirectionalLight('#ffd399',3.2)
  sun.position.set(-8,12,6)
  world.add(sun)
  world.userData={
    route,
    water,
    reflection,
    wake:null,
    mountainLanding,
    forestLanding,
    surfaceMaterials:[surfaceMaterial,reflectionMaterial,shallowsMaterial],
    forestSightline,
    copyAnchor:mountainLanding.position.clone().add(new THREE.Vector3(-5,2,-2)),
  }
  return world
}

export function updateWaterWorld(world,elapsed,boat){
  const {water,reflection}=world.userData
  animateWaveVertices(water,elapsed,1.43,.05,0)
  animateWaveVertices(reflection,elapsed,2.17,.023,1.2)
  water.position.y=.012+Math.sin(elapsed*1.11)*.012
  reflection.position.y=.016+Math.sin(elapsed*1.83+.7)*.008
  const shallows=world.getObjectByName('water-shallows')
  if(shallows) shallows.position.y=Math.sin(elapsed*.82)*.009
  const foam=world.getObjectByName('water-foam-accents')
  if(foam) foam.children.forEach((accent,index)=>{
    accent.material.opacity=.34+.16*Math.sin(elapsed*(1.2+(index%3)*.17)+index*.8)
  })
  if(boat){
    const boatWake=boat.getObjectByName('boat-wake')
    if(boatWake) world.userData.wake=boatWake
  }
}
