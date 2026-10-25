import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { downloadAsset } from './assetDownload'

const templates=new Map()
const requests=new Set()
const baseURL=import.meta.env?.BASE_URL||'/'
let leases=0,pending=null

const ownTemplate=(kind,gltf)=>{
  const resources={geometries:new Set(),materials:new Set(),textures:new Set(),skeletons:new Set()}
  gltf.scene.traverse(object=>{
    if(object.geometry){
      object.geometry.userData.managedByWildlifeTemplate=true
      resources.geometries.add(object.geometry)
    }
    if(object.skeleton) resources.skeletons.add(object.skeleton)
    for(const material of (Array.isArray(object.material)?object.material:[object.material]).filter(Boolean)){
      resources.materials.add(material)
      for(const value of Object.values(material)) if(value?.isTexture){
        value.userData.managedByWildlifeTemplate=true
        resources.textures.add(value)
      }
    }
  })
  return{kind,root:gltf.scene,animations:gltf.animations||[],resources,actors:0,disposed:false}
}

const disposeTemplate=owner=>{
  if(owner.disposed) return
  owner.disposed=true
  Object.values(owner.resources).forEach(collection=>collection.forEach(resource=>resource.dispose()))
  if(templates.get(owner.kind)===owner) templates.delete(owner.kind)
}

const releaseUnused=owner=>{
  if(!leases&&!owner.actors) disposeTemplate(owner)
}

const loadTemplate=(kind,url,timeoutMs)=>new Promise((resolve,reject)=>{
  const controller=new AbortController()
  let expired=false
  const cancel=error=>{
    if(expired) return
    expired=true
    controller.abort()
    clearTimeout(timer)
    requests.delete(cancel)
    reject(error)
  }
  let timer
  const refresh=()=>{
    clearTimeout(timer)
    timer=setTimeout(()=>cancel(new Error(`${kind} wildlife loading timed out`)),timeoutMs)
  }
  refresh()
  requests.add(cancel)
  ;(async()=>{
    try{
      const bytes=await downloadAsset(url,{signal:controller.signal,onActivity:refresh})
      if(expired) return
      const gltf=await new GLTFLoader().parseAsync(bytes,url.slice(0,url.lastIndexOf('/')+1))
      const owner=ownTemplate(kind,gltf)
      if(expired){disposeTemplate(owner);return}
      templates.set(kind,owner)
      releaseUnused(owner)
      resolve(owner)
    }catch(error){if(!expired) reject(error)}
    finally{clearTimeout(timer);requests.delete(cancel)}
  })()
})

/** Acquire before scene construction. Strict startup requires both species;
 * optional callers never replace an animal during the running journey. */
export function preloadRealisticWildlife({timeout=8000,strict=false}={}){
  leases++
  const validate=results=>{
    const failed=results.find(result=>result.status==='rejected')
    if(strict&&failed) throw failed.reason
    return results
  }
  if(pending) return strict?pending.then(validate):pending
  pending=Promise.allSettled(['deer','boar'].map(kind=>{
    const owner=templates.get(kind)
    return owner&&!owner.disposed?Promise.resolve(owner):loadTemplate(kind,`${baseURL}models/forest-${kind}.glb`,timeout)
  })).then(results=>{
    if(results.every(result=>result.status==='rejected')) throw results[0].reason
    return results
  }).finally(()=>{pending=null})
  return strict?pending.then(validate):pending
}

export function releaseRealisticWildlife(){
  leases=Math.max(0,leases-1)
  templates.forEach(releaseUnused)
  queueMicrotask(()=>{
    if(!leases) requests.forEach(cancel=>cancel(new DOMException('Scene released','AbortError')))
  })
}

/** Immutable buffers and coat textures are shared; transforms, materials and
 * skeletons belong to the returned animal. An unavailable asset returns null. */
export function createRealisticWildlife(kind){
  const owner=templates.get(kind)
  if(!owner||owner.disposed) return null
  const root=cloneSkeleton(owner.root)
  const materials=new Map(),skeletons=new Set()
  root.traverse(object=>{
    if(!object.isMesh) return
    const cloneMaterial=source=>{
      if(!materials.has(source)) materials.set(source,source.clone())
      return materials.get(source)
    }
    object.material=Array.isArray(object.material)?object.material.map(cloneMaterial):cloneMaterial(object.material)
    object.castShadow=true
    object.receiveShadow=true
    if(object.isSkinnedMesh){
      skeletons.add(object.skeleton)
      object.frustumCulled=false
    }
  })
  root.animations=owner.animations
  owner.actors++
  let disposed=false
  root.userData.realisticWildlife=true
  root.userData.wildlifeKind=kind
  root.userData.disposeRealisticWildlife=()=>{
    if(disposed) return
    disposed=true
    skeletons.forEach(skeleton=>skeleton.dispose())
    owner.actors--
    releaseUnused(owner)
  }
  return root
}
