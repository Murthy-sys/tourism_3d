import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { downloadAsset } from './assetDownload'

const templates=new Map()
const requests=new Set()
let leases=0,pending=null
const baseURL=import.meta.env?.BASE_URL||'/'
const releaseUnused=owner=>{
  if(!owner||owner.disposed||leases||owner.instances) return
  owner.disposed=true
  owner.geometries.forEach(geometry=>geometry.dispose())
  owner.materials.forEach(material=>material.dispose())
  owner.textures.forEach(texture=>texture.dispose())
  if(templates.get(owner.kind)===owner) templates.delete(owner.kind)
}

const ownTemplate=(kind,scene)=>{
  const geometries=new Set(),materials=new Set(),textures=new Set()
  scene.traverse(object=>{
    if(object.geometry){
      object.geometry.userData.managedByVehicleTemplate=true
      geometries.add(object.geometry)
    }
    for(const material of (Array.isArray(object.material)?object.material:[object.material]).filter(Boolean)){
      materials.add(material)
      for(const value of Object.values(material)) if(value?.isTexture){
        value.userData.managedByVehicleTemplate=true
        textures.add(value)
      }
    }
  })
  return{kind,root:scene.children[0],geometries,materials,textures,instances:0,disposed:false}
}

const loadTemplate=(kind,url,timeoutMs=20000)=>new Promise((resolve,reject)=>{
  const controller=new AbortController()
  let expired=false
  const cancel=error=>{
    if(expired) return
    expired=true
    controller.abort()
    clearTimeout(timeout)
    requests.delete(cancel)
    reject(error)
  }
  let timeout
  const refresh=()=>{
    clearTimeout(timeout)
    timeout=setTimeout(()=>cancel(new Error(`${kind} model loading timed out`)),timeoutMs)
  }
  refresh()
  requests.add(cancel)
  ;(async()=>{
    try{
      const data=await downloadAsset(url,{signal:controller.signal,onActivity:refresh})
      if(expired) return
      const gltf=await new GLTFLoader().parseAsync(data,url.slice(0,url.lastIndexOf('/')+1))
      const owner=ownTemplate(kind,gltf.scene)
      if(expired){
        owner.geometries.forEach(resource=>resource.dispose())
        owner.materials.forEach(resource=>resource.dispose())
        owner.textures.forEach(resource=>resource.dispose())
        return
      }
      templates.set(kind,owner)
      releaseUnused(owner)
      resolve(owner)
    }catch(error){if(!expired) reject(error)}
    finally{clearTimeout(timeout);requests.delete(cancel)}
  })()
})

/** Acquire once per scene lifecycle, then call releaseRealisticVehicles. */
export function preloadRealisticVehicles(quality=typeof window!=='undefined'&&window.innerWidth<768?'mobile':'desktop',{timeout=20000,strict=false}={}){
  leases++
  const validate=results=>{
    const failed=results.find(result=>result.status==='rejected')
    if(strict&&failed) throw failed.reason
    return results
  }
  if(pending) return strict?pending.then(validate):pending
  const files={jeep:'utility-jeep.glb',bus:`tour-bus${quality==='mobile'?'-mobile':''}.glb`}
  pending=Promise.allSettled(Object.entries(files).map(([kind,file])=>{
    const existing=templates.get(kind)
    return existing&&!existing.disposed?Promise.resolve(existing):loadTemplate(kind,`${baseURL}models/${file}`,timeout)
  })).then(results=>{
    if(results.every(result=>result.status==='rejected')) throw results[0].reason
    return results
  }).finally(()=>{pending=null})
  return strict?pending.then(validate):pending
}

export function releaseRealisticVehicles(){
  leases=Math.max(0,leases-1)
  templates.forEach(releaseUnused)
  queueMicrotask(()=>{
    if(!leases) requests.forEach(cancel=>cancel(new DOMException('Scene released','AbortError')))
  })
}

/** Shared immutable geometry and textures; each vehicle owns its materials. */
export function createRealisticVehicle(kind){
  const owner=templates.get(kind)
  if(!owner||owner.disposed) return null
  const root=owner.root.clone(true),materials=new Map()
  root.traverse(object=>{
    if(!object.isMesh) return
    const clone=source=>{
      if(!materials.has(source)){
        const material=source.clone()
        material.envMapIntensity=.85
        if(material.transparent) material.depthWrite=false
        materials.set(source,material)
      }
      return materials.get(source)
    }
    object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material)
    object.castShadow=!object.material.transparent
    object.receiveShadow=true
  })
  owner.instances++
  let disposed=false
  root.userData.realisticVehicle=true
  root.userData.disposeRealisticVehicle=()=>{
    if(disposed) return
    disposed=true
    owner.instances--
    releaseUnused(owner)
  }
  return root
}
