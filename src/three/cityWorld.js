import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createEnvironmentMaterial,createFoliageMaterial,createCanopyTexture,projectGroundUV } from './environmentSurface'
import { createForestTreeGeometry } from './forestGeometry'
import { smootherstep } from './terrain'
import { createCityCrowd,updateCityCrowd } from './cityCrowd'

export const CITY_DEPARTURE=Object.freeze({
  coach:Object.freeze([-4,.35,150]),
  heading:0,
  boardingStart:.025,
  boardingEnd:.044,
})

const hash=(index,salt=0)=>{
  const value=Math.sin(index*127.1+salt*311.7)*43758.5453
  return value-Math.floor(value)
}
const group=name=>{const value=new THREE.Group();value.name=name;return value}
const material=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,...options})
const box=(size,position,rotation=0)=>new THREE.BoxGeometry(...size).rotateY(rotation).translate(...position)
const combine=parts=>{
  const geometry=mergeGeometries(parts)
  parts.forEach(part=>part.dispose())
  return geometry
}
const addMesh=(root,name,geometry,mat,shadow=true)=>{
  const object=new THREE.Mesh(geometry,mat)
  object.name=name
  object.castShadow=shadow
  object.receiveShadow=true
  root.add(object)
  return object
}
const surfaceTexture=()=>{
  const size=96,data=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const shade=Math.round(233+hash(x+y*size,7)*9+Math.sin(x*.17)*2)
    data.set([shade,shade,shade,255],(y*size+x)*4)
  }
  const texture=new THREE.DataTexture(data,size,size)
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.repeat.set(6,6)
  texture.colorSpace=THREE.SRGBColorSpace
  texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.generateMipmaps=true
  texture.anisotropy=4
  texture.userData.ownedByJourney=true
  texture.needsUpdate=true
  return texture
}

// Entire streets share material batches: facade detail adds depth without a
// draw call for each window, balcony, floor slab or roof service enclosure.
const addCityBlocks=(root,quality)=>{
  const texture=surfaceTexture()
  const facades=['#b0ada1','#938c7b','#989e98','#a59a89'].map(color=>material(color,{map:texture,bumpMap:texture,bumpScale:.025}))
  const glazing=['#425353','#536467','#354849'].map(color=>material(color,{roughness:.27,metalness:.3,envMapIntensity:.8}))
  const masonry=facades.map(()=>[]),windows=glazing.map(()=>[])
  const trim=[],metal=[],shops=[],warmWindows=[],roofs=[]
  const footprints=[]
  const buildings=[
    [-26,143,18,17,20],[-26,171,18,23,25],[-27,202,20,29,25],
    [29,131,24,12,20],[29,202,24,22,25],[27,229,21,16,21],
    [-50,139,18,25,18],[-52,165,22,35,21],[-52,196,22,31,23],
    [-27,231,20,18,20],[55,160,22,32,23],[54,197,22,37,22],
    [-72,146,20,23,22],[-76,187,27,40,25],[-51,233,22,30,21],
    [5,253,21,28,20],[35,261,22,39,24],[-23,266,24,32,22],
  ]
  for(const [index,[x,z,width,height,depth]] of buildings.entries()){
    if(quality==='mobile'&&index>11) continue
    const base=.5,top=base+height
    const floorCount=Math.floor(height/3.1)
    masonry[index%facades.length].push(box([width,height,depth],[x,base+height/2,z]))
    roofs.push(box([width+.34,.22,depth+.34],[x,top+.11,z]))
    // Thin parapets conceal roof equipment, without an oversized floating cap.
    trim.push(
      box([width,.65,.18],[x,top+.325,z-depth/2]),
      box([width,.65,.18],[x,top+.325,z+depth/2]),
      box([.18,.65,depth],[x-width/2,top+.325,z]),
      box([.18,.65,depth],[x+width/2,top+.325,z]),
    )
    const axisSign=x<0?1:-1
    const front=x+axisSign*(width/2+.026)
    const columns=Math.floor(depth/2.6)
    for(let floor=1;floor<floorCount;floor++){
      const y=base+floor*3.1+1.35
      trim.push(box([.38,.14,depth],[front,y-1.2,z]))
      for(let column=0;column<columns;column++){
        const windowZ=z-depth/2+1.4+column*(depth-2.8)/Math.max(1,columns-1)
        const window=box([.045,1.75,1.7],[front,y,windowZ])
        if(hash(index*100+floor*10+column,1)>.94) warmWindows.push(window)
        else windows[(column+floor+index)%3].push(window)
        trim.push(box([.12,1.82,.055],[front+axisSign*.04,y,windowZ]))
        if(floor<3&&column%3===0){
          metal.push(box([.52,.48,.65],[front+axisSign*.28,y-.93,windowZ+.54]))
        }
      }
    }
    // Window bays on the end walls remain visible during the descent.
    for(const side of [-1,1]) for(let floor=1;floor<floorCount;floor++){
      const y=base+floor*3.1+1.35
      for(let column=0;column<Math.floor(width/3);column++){
        windows[(column+index)%3].push(box([1.6,1.75,.045],[x-width/2+1.8+column*2.9,y,z+side*(depth/2+.025)]))
      }
    }
    for(let shop=0;shop<Math.floor(depth/4);shop++){
      const shopZ=z-depth/2+2.2+shop*4
      shops.push(box([.055,2.4,3.2],[front+axisSign*.015,1.7,shopZ]))
      trim.push(box([1.15,.16,3.7],[front+axisSign*.42,3.15,shopZ]))
      metal.push(box([.07,2.35,.055],[front+axisSign*.06,1.7,shopZ]))
    }
    metal.push(box([2.1,.85,1.4],[x+width*.18,top+.45,z-depth*.16]))
    roofs.push(box([3.3,2.3,3.8],[x-width*.23,top+1.15,z+depth*.18]))
    const tank=new THREE.CylinderGeometry(.85,.85,1.25,12).translate(x+width*.23,top+.8,z+depth*.21)
    metal.push(tank)
    footprints.push({x,z,width,depth,height})
  }
  masonry.forEach((parts,index)=>addMesh(root,`city-masonry-${index}`,combine(parts),facades[index]))
  windows.forEach((parts,index)=>addMesh(root,`city-glazing-${index}`,combine(parts),glazing[index],false))
  addMesh(root,'city-floor-slabs-and-window-frames',combine(trim),material('#b4b3a9'))
  addMesh(root,'city-rooftops',combine(roofs),material('#85867e',{map:texture}))
  addMesh(root,'city-roof-services-and-facade-equipment',combine(metal),material('#646b66',{metalness:.24}))
  addMesh(root,'city-ground-floor-shopfronts',combine(shops),material('#3d4b48',{roughness:.4,metalness:.12}))
  if(warmWindows.length) addMesh(root,'city-occupied-office-windows',combine(warmWindows),material('#a29b7c',{emissive:'#766e51',emissiveIntensity:.08}),false)
  return footprints
}

const addStreets=root=>{
  const asphalt=material('#55564e',{map:surfaceTexture(),roughness:.98})
  const paving=material('#aaa696',{map:surfaceTexture(),roughness:.95})
  const ground=new THREE.PlaneGeometry(210,190).rotateX(-Math.PI/2).translate(-6,.31,213)
  addMesh(root,'city-ground',projectGroundUV(ground,3),material('#8c8c7b',{map:surfaceTexture()}),false)
  const roads=[box([13,.04,130],[-8.5,.35,193]),box([119,.04,11],[-12,.355,188])]
  addMesh(root,'city-asphalt',combine(roads),asphalt,false)
  const walks=[
    box([4,.16,55],[0,.43,155.5]),box([22,.16,30],[13,.43,160]),
    box([3.8,.16,130],[-16.9,.43,193]),box([4,.16,62],[0,.43,227]),
  ]
  addMesh(root,'city-sidewalk-and-departure-plaza',combine(walks),paving)
  const curbs=[],markings=[],seams=[]
  for(let z=130;z<255;z+=3){
    if(z>181&&z<197) continue
    curbs.push(box([.19,.23,2.94],[-1.95,.465,z]),box([.19,.23,2.94],[-15.05,.465,z]))
    seams.push(box([3.6,.006,.018],[0,.514,z]),box([3.6,.006,.018],[-16.9,.514,z]))
    if(z%6===4) markings.push(box([.12,.012,2.1],[-10,.38,z]))
  }
  // Bus bay edge, a crossing and a divided traffic lane give recognizable scale.
  for(let z=140;z<161;z+=3.1) markings.push(box([.12,.012,1.7],[-6.25,.38,z]))
  for(let x=-14.3;x<-2;x+=1.1) markings.push(box([.5,.012,3.3],[x,.38,179]))
  addMesh(root,'city-stone-curbs',combine(curbs),material('#c0bba9'))
  addMesh(root,'city-road-markings',combine(markings),material('#c0bda6'),false)
  addMesh(root,'city-pavement-joints',combine(seams),material('#7c7c6e'),false)
  const steel=[],shelter=[],benches=[]
  for(const z of [154,160]){
    steel.push(box([.095,2.85,.095],[3.8,1.92,z]),box([.095,2.85,.095],[.4,1.92,z]))
  }
  shelter.push(box([4,.14,6.6],[2.1,3.39,157]))
  benches.push(box([.5,.13,4.3],[3.4,.97,157]))
  for(const z of [155.3,158.7]) steel.push(box([.34,.48,.1],[3.4,.73,z]))
  const furniture=root.userData.furniture=group('city-bus-shelter')
  root.add(furniture)
  addMesh(furniture,'city-shelter-canopy',combine(shelter),material('#646f66'))
  addMesh(furniture,'city-shelter-frame',combine(steel),material('#4b5550',{metalness:.45}))
  addMesh(furniture,'city-shelter-bench',combine(benches),material('#7b7059'))
  const poles=[],lamps=[],bollards=[]
  for(const x of [-16.3,1.1]) for(const z of [134,174,211,246]){
    poles.push(new THREE.CylinderGeometry(.055,.09,7.2,8).translate(x,3.95,z))
    poles.push(box([1.4,.08,.09],[x+(x<0?.65:-.65),7.5,z]))
    lamps.push(box([.62,.09,.28],[x+(x<0?1.2:-1.2),7.45,z]))
  }
  for(let z=143;z<=170;z+=4.3) bollards.push(new THREE.CylinderGeometry(.065,.07,.75,8).translate(-1.45,.88,z))
  addMesh(root,'city-streetlights-and-bollards',combine([...poles,...bollards]),material('#62665d',{metalness:.4}))
  addMesh(root,'city-streetlight-heads',combine(lamps),material('#c0c1b0',{metalness:.25}),false)
}

const addStreetTrees=(root,quality)=>{
  const trees=group('city-street-trees')
  root.add(trees)
  const leafMap=createCanopyTexture()
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion()
  const positions=[[-16.8,132],[-16.8,164],[-16.8,210],[-16.8,242],[14,136],[7,177],[8,214],[8,246],[24,161],[22,180]]
  if(quality==='desktop') positions.push([-39,123],[-39,222],[43,177],[43,237])
  for(let variant=0;variant<2;variant++){
    const instances=positions.filter((_,index)=>index%2===variant)
    const geometry=createForestTreeGeometry(variant+2,quality,{distant:true})
    const wood=new THREE.InstancedMesh(geometry.skeleton,createEnvironmentMaterial('#786c55','bark'),instances.length)
    const leaves=new THREE.InstancedMesh(geometry.crown,createFoliageMaterial(variant?'#438b43':'#34783d',leafMap),instances.length)
    wood.name=`city-tree-trunks-${variant}`
    leaves.name=`city-tree-leaves-${variant}`
    instances.forEach(([x,z],index)=>{
      position.set(x,.5,z)
      const size=.64+hash(index,variant)*.19
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,hash(index,variant+4)*Math.PI*2)
      matrix.compose(position,rotation,scale.set(size,size,size))
      wood.setMatrixAt(index,matrix)
      leaves.setMatrixAt(index,matrix)
    })
    for(const object of [wood,leaves]){
      object.castShadow=quality==='desktop'
      object.receiveShadow=true
      object.computeBoundingSphere()
      trees.add(object)
    }
  }
}

const instanceBatch=(root,name,geometry,mat,count)=>{
  const object=new THREE.InstancedMesh(geometry,mat,count)
  object.name=name
  object.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  object.castShadow=true
  object.receiveShadow=true
  // Animated actors stay in a known compact district; avoid stale instance
  // bounds from their first frame as commuters and traffic cross the street.
  object.frustumCulled=false
  root.add(object)
  return object
}

const createTraffic=(root,quality)=>{
  const traffic=group('city-moving-traffic')
  root.add(traffic)
  const cars=Array.from({length:quality==='mobile'?4:7},(_,index)=>({index,lane:index%2?-12.3:-8.5,direction:index%2?1:-1,offset:hash(index,54)*120,speed:2.1+hash(index,55)*1.4}))
  const count=cars.length
  const body=combine([
    new RoundedBoxGeometry(1.7,.59,4.05,2,.16).translate(0,.72,0),
    new RoundedBoxGeometry(1.52,.65,2.17,2,.17).translate(0,1.17,.12),
  ])
  const glass=combine([
    box([.035,.39,1.73],[-.771,1.25,.12]),box([.035,.39,1.73],[.771,1.25,.12]),
    box([1.34,.41,.025],[0,1.24,-.982],-.0),box([1.34,.38,.025],[0,1.23,1.222]),
  ])
  const rubber=[],rims=[],lights=[]
  for(const side of [-1,1]) for(const z of [-1.28,1.29]){
    rubber.push(new THREE.CylinderGeometry(.31,.31,.19,12).rotateZ(Math.PI/2).translate(side*.8,.4,z))
    rims.push(new THREE.CylinderGeometry(.17,.17,.02,10).rotateZ(Math.PI/2).translate(side*.905,.4,z))
  }
  for(const side of [-1,1]) lights.push(box([.38,.12,.025],[side*.55,.78,-2.034]))
  const batches=[
    instanceBatch(traffic,'city-traffic-paint',body,material('#ffffff',{roughness:.44,metalness:.16}),count),
    instanceBatch(traffic,'city-traffic-glass',glass,material('#354b50',{roughness:.24,metalness:.3}),count),
    instanceBatch(traffic,'city-traffic-tires',combine(rubber),material('#292b27'),count),
    instanceBatch(traffic,'city-traffic-wheel-trim',combine(rims),material('#999b8d',{metalness:.6,roughness:.4}),count),
    instanceBatch(traffic,'city-traffic-lights',combine(lights),material('#bdbda8',{roughness:.3}),count),
  ]
  const colors=['#a6a79f','#8b9389','#7b807c','#b2aca0','#737d7d','#9e9483','#677570']
  cars.forEach((car,index)=>batches[0].setColorAt(index,new THREE.Color(colors[index%colors.length])))
  return{cars,batches,matrix:new THREE.Matrix4(),position:new THREE.Vector3(),scale:new THREE.Vector3(1,1,1),rotation:new THREE.Quaternion()}
}

export function createCityWorld(_materials,quality='desktop'){
  const world=group('busy-city')
  addStreets(world)
  const buildings=addCityBlocks(world,quality)
  addStreetTrees(world,quality)
  const crowd=createCityCrowd(quality)
  world.add(crowd.group)
  const traffic=createTraffic(world,quality)
  Object.assign(world.userData,{quality,buildings,crowd,traffic,boardingPeople:crowd.people.filter(person=>person.boarding),coachPose:CITY_DEPARTURE,groundHeight:.35})
  updateCityWorld(world,0,true,0)
  return world
}

export function updateCityWorld(world,elapsed=0,reducedMotion=false,openingProgress=0){
  const {crowd,traffic}=world.userData
  const time=reducedMotion?0:Math.max(0,Number.isFinite(elapsed)?elapsed:0)
  const boarding=smootherstep(CITY_DEPARTURE.boardingStart,CITY_DEPARTURE.boardingEnd,openingProgress)
  updateCityCrowd(crowd,time,reducedMotion,boarding)
  traffic.cars.forEach(car=>{
    const z=132+((car.offset+time*car.speed*car.direction)%119+119)%119
    traffic.position.set(car.lane,.35,z)
    traffic.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,car.direction>0?Math.PI:0)
    traffic.matrix.compose(traffic.position,traffic.rotation,traffic.scale)
    traffic.batches.forEach(batch=>batch.setMatrixAt(car.index,traffic.matrix))
  })
  traffic.batches.forEach(batch=>{batch.instanceMatrix.needsUpdate=true})
  world.userData.boardingProgress=boarding
}
