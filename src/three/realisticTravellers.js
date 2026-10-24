import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'

const UP=new THREE.Vector3(0,1,0)
const DOWN=new THREE.Vector3(0,-1,0)
const LOAD_TIMEOUT=20000
const DEFAULT_URL=`${import.meta.env?.BASE_URL||'/'}models/traveller.glb`
let template=null
let pending=null
let leases=0

function collectResources(scene){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set()
  scene.traverse(object=>{
    if(object.geometry) geometries.add(object.geometry)
    if(object.skeleton) skeletons.add(object.skeleton)
    for(const material of (Array.isArray(object.material)?object.material:[object.material]).filter(Boolean)){
      materials.add(material)
      for(const value of Object.values(material)) if(value?.isTexture) textures.add(value)
    }
  })
  geometries.forEach(geometry=>{geometry.userData.managedByTravellerTemplate=true})
  textures.forEach(texture=>{texture.userData.managedByTravellerTemplate=true})
  return{geometries,materials,textures,skeletons}
}

function disposeOwner(owner){
  if(owner.disposed) return
  owner.disposed=true
  for(const collection of Object.values(owner.resources)) collection.forEach(resource=>resource.dispose())
  if(template===owner) template=null
}

function releaseUnused(owner=template){
  if(owner&&!leases&&!owner.actors) disposeOwner(owner)
}

function setWorldQuaternion(bone,quaternion){
  const parentRotation=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
  bone.quaternion.copy(parentRotation.multiply(quaternion))
  bone.updateWorldMatrix(false,true)
}

function updateSkeletons(scene){
  scene.updateWorldMatrix(true,true)
  const skeletons=new Set()
  scene.traverse(object=>{if(object.skeleton) skeletons.add(object.skeleton)})
  skeletons.forEach(skeleton=>skeleton.update())
}

function prepareTemplate(scene){
  const resources=collectResources(scene)
  const remove=[]
  scene.traverse(object=>{
    if(/fine.?scalp.?roots|^Phone$|^teeth_base$/i.test(object.name)) remove.push(object)
  })
  remove.forEach(object=>object.removeFromParent())
  scene.updateWorldMatrix(true,true)
  const feet={}
  for(const side of ['l','r']){
    const foot=scene.getObjectByName(`foot_${side}`)
    const calf=scene.getObjectByName(`calf_${side}`)
    if(!foot||!calf) throw new Error('Traveller asset is missing its foot rig')
    feet[side]=foot.getWorldQuaternion(new THREE.Quaternion())
    // The source uses independent IK feet. Parenting them preserves their bind
    // matrices while making ankles follow our deterministic calf animation.
    calf.attach(foot)
  }
  for(const name of ['upperarm_l','lowerarm_l','upperarm_r','lowerarm_r','thigh_l','calf_l','thigh_r','calf_r']){
    const bone=scene.getObjectByName(name)
    const world=bone.getWorldQuaternion(new THREE.Quaternion())
    const direction=UP.clone().applyQuaternion(world)
    const straight=new THREE.Quaternion().setFromUnitVectors(direction,DOWN).multiply(world)
    setWorldQuaternion(bone,straight)
  }
  for(const side of ['l','r']) setWorldQuaternion(scene.getObjectByName(`foot_${side}`),feet[side])
  updateSkeletons(scene)
  const bounds=new THREE.Box3().setFromObject(scene,true)
  const height=bounds.max.y-bounds.min.y
  if(!Number.isFinite(height)||height<=0) throw new Error('Traveller asset has invalid dimensions')
  const normalized=new THREE.Group()
  normalized.name='realistic-traveller-avatar'
  normalized.scale.setScalar(1.8/height)
  normalized.position.y=-bounds.min.y*normalized.scale.y
  normalized.add(scene)
  updateSkeletons(normalized)
  const neutral=new Map()
  normalized.traverse(object=>{
    if(object.isBone) neutral.set(object.name,{
      local:object.quaternion.clone(),world:object.getWorldQuaternion(new THREE.Quaternion()),
    })
  })
  const soles=[new THREE.Box3(),new THREE.Box3()]
  const point=new THREE.Vector3()
  normalized.traverse(object=>{
    if(!object.isSkinnedMesh||!/^shoes01/.test(object.name)) return
    for(let i=0;i<object.geometry.attributes.position.count;i++){
      object.getVertexPosition(i,point).applyMatrix4(object.matrixWorld)
      soles[point.x<0?0:1].expandByPoint(point)
    }
  })
  const hipY=normalized.getObjectByName('thigh_l').getWorldPosition(point).y
  return{scene:normalized,resources,neutral,soles,hipY,actors:0,disposed:false}
}

function loadTemplate(url,timeout=LOAD_TIMEOUT){
  return new Promise((resolve,reject)=>{
    const controller=new AbortController()
    let expired=false
    const timer=setTimeout(()=>{
      expired=true
      controller.abort()
      reject(new Error('Traveller model loading timed out'))
    },timeout)
    ;(async()=>{
      try{
        const response=await fetch(url,{signal:controller.signal})
        if(!response.ok) throw new Error(`Traveller model request failed (${response.status})`)
        const data=await response.arrayBuffer()
        const gltf=await new GLTFLoader().parseAsync(data,url.slice(0,url.lastIndexOf('/')+1))
        const owner=prepareTemplate(gltf.scene)
        if(expired){disposeOwner(owner);return}
        resolve(owner)
      }catch(error){if(!expired) reject(error)}
      finally{clearTimeout(timer)}
    })()
  })
}

/** Each caller owns a lease, including while loading, and must release it. */
export function preloadRealisticTravellers(url=DEFAULT_URL,{timeout=LOAD_TIMEOUT}={}){
  leases++
  if(template&&!template.disposed) return Promise.resolve(template)
  if(!pending){
    pending=loadTemplate(url,timeout).then(owner=>{
      template=owner
      releaseUnused(owner)
      return owner
    }).finally(()=>{pending=null})
  }
  return pending
}

export function releaseRealisticTravellers(){
  leases=Math.max(0,leases-1)
  releaseUnused()
}

export const disposeRealisticTravellerTemplate=releaseRealisticTravellers

function createControls(root,seated){
  const hipY=seated?.035:.87
  const part=(name,parent=root,x=0,y=0,z=0)=>{
    const object=new THREE.Group()
    object.name=name
    object.position.set(x,y,z)
    parent.add(object)
    return object
  }
  const torso=part('torso',root,0,hipY+.015)
  part('layered-torso-shell',torso)
  part('trousers',root,0,hipY)
  part('neck',root,0,hipY+.615)
  const head=part('anatomical-head',root,0,hipY+.66,.008)
  part('head',head)
  const armRoot=part('arms'),legRoot=part('legs'),boots=part('boots')
  const arms=[],legs=[],elbows=[],knees=[]
  for(const side of [-1,1]){
    const label=side<0?'left':'right'
    const arm=part(`${label}-arm`,armRoot,side*.215,hipY+.49)
    arm.rotation.z=side*.065
    const elbow=part(`${label}-elbow`,arm,0,-.285)
    elbow.rotation.x=seated?-1.2:-.16
    arm.userData.elbow=elbow
    const leg=part(`${label}-leg`,legRoot,side*.105,hipY)
    leg.rotation.x=seated?-1.48:0
    const knee=part(`${label}-knee`,leg,0,-.385)
    knee.rotation.x=seated?1.48:.035
    leg.userData.knee=knee
    arms.push(arm);legs.push(leg);elbows.push(elbow);knees.push(knee)
  }
  return{torso,head,arms,legs,elbows,knees,boots}
}

function tintMaterial(material,palette,index){
  const name=material.name
  if(/original top/i.test(name)) material.color.set(palette.jacket)
  else if(/original bottom/i.test(name)) material.color.set(palette.trousers)
  else if(/shoes01/i.test(name)) material.color.set('#6a6256')
  else if(/short01|eyebrow/i.test(name)) material.color.set(palette.hair)
  else if(/anatomical.*body/i.test(name)){
    // Preserve the photographic skin's color variation and surface detail.
    material.color.set(['#d8c2b0','#ead7c5','#c7ad9a','#e2c8b1'][index%4])
  }
  return material
}

/** A synchronous factory once preloaded; null selects the existing fallback. */
export function createRealisticTraveller(index,{palette,seated=false}){
  const owner=template
  if(!owner||owner.disposed) return null
  const root=new THREE.Group()
  root.name='expedition-traveller'
  const controls=createControls(root,seated)
  const avatar=cloneSkeleton(owner.scene)
  root.add(avatar)
  const materials=new Map()
  const skeletons=new Set()
  let sharedSkeleton=null
  avatar.traverse(object=>{
    if(!object.isMesh) return
    const cloneMaterial=source=>{
      if(!materials.has(source)) materials.set(source,tintMaterial(source.clone(),palette,index))
      return materials.get(source)
    }
    object.material=Array.isArray(object.material)?object.material.map(cloneMaterial):cloneMaterial(object.material)
    object.castShadow=true
    object.receiveShadow=true
    if(object.isSkinnedMesh){
      // Every source mesh uses the same 56-bone rig. Share its GPU bone texture
      // inside one actor while keeping each actor's skeleton independent.
      if(!sharedSkeleton) sharedSkeleton=object.skeleton
      if(object.skeleton.bones.every((bone,i)=>bone===sharedSkeleton.bones[i])) object.skeleton=sharedSkeleton
      skeletons.add(object.skeleton)
      object.frustumCulled=false
      object.boundingBox=null
      object.boundingSphere=null
    }
  })
  root.updateWorldMatrix(true,true)
  const bootMeshes=[]
  owner.soles.forEach((box,index)=>{
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3())
    const sole=new THREE.Mesh(new THREE.BoxGeometry(size.x,.025,size.z),new THREE.MeshBasicMaterial())
    sole.name='boot-sole'
    sole.visible=false
    sole.position.set(center.x,box.min.y+.0125,center.z)
    root.add(sole)
    root.updateWorldMatrix(true,true)
    avatar.getObjectByName(index===0?'foot_r':'foot_l').attach(sole)
    controls.legs[index].userData.sole=sole
    bootMeshes.push(sole)
  })
  controls.boots.userData.parts=bootMeshes
  const bindings=[
    ['spine_01',controls.torso],['head',controls.head],
    ['upperarm_r',controls.arms[0]],['upperarm_l',controls.arms[1]],
    ['lowerarm_r',controls.elbows[0]],['lowerarm_l',controls.elbows[1]],
    ['thigh_r',controls.legs[0]],['thigh_l',controls.legs[1]],
    ['calf_r',controls.knees[0]],['calf_l',controls.knees[1]],
  ].map(([name,control])=>({bone:avatar.getObjectByName(name),control,...owner.neutral.get(name)}))
  const state={avatar,bindings,skeletons,baseY:avatar.position.y,hipY:owner.hipY,
    rotation:new THREE.Quaternion(),delta:new THREE.Quaternion()}
  owner.actors++
  let disposed=false
  root.role=palette.role
  root.userData={role:palette.role,identity:index,adultProportions:true,seated,realistic:true,
    ...controls,bootMeshes,realisticState:state,
    disposeRealisticTraveller(){
      if(disposed) return
      disposed=true
      skeletons.forEach(skeleton=>skeleton.dispose())
      owner.actors--
      releaseUnused(owner)
    },
  }
  syncExpeditionPerson(root)
  return root
}

/** Apply legacy joint controls before reading foot bounds or rendering. */
export function syncExpeditionPerson(person){
  const state=person?.userData.realisticState
  if(!state) return
  const {avatar,bindings,rotation,delta}=state
  const hipY=(person.userData.legs[0].position.y+person.userData.legs[1].position.y)/2
  avatar.position.y=state.baseY+(hipY-.87)*(state.hipY-.035)/.835
  for(const binding of bindings){
    rotation.setFromEuler(binding.control.rotation)
    delta.copy(binding.world).invert().multiply(rotation).multiply(binding.world)
    binding.bone.quaternion.copy(binding.local).multiply(delta)
  }
  avatar.updateWorldMatrix(true,true)
  state.skeletons.forEach(skeleton=>skeleton.update())
}
