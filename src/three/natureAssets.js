import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { downloadAsset } from './assetDownload'

const ROOT=`${import.meta.env?.BASE_URL||'/'}textures/nature/`
const TIMEOUT=20000
const assets=new Map()
const requests=new Set()
let pending=null,leases=0

function releaseUnused(){
  if(leases||pending) return
  assets.forEach(texture=>texture.dispose())
  assets.clear()
}

function loadTexture(key,hdr=false,{compact=false,timeout=TIMEOUT,strict=false}={}){
  return new Promise((resolve,reject)=>{
    let expired=false,timer,blobURL
    const controller=new AbortController()
    const cleanup=()=>{
      clearTimeout(timer)
      requests.delete(cancel)
      if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null}
    }
    const cancel=error=>{
      if(expired) return
      expired=true
      controller.abort()
      cleanup()
      reject(error)
    }
    const refresh=()=>{
      if(expired) return
      clearTimeout(timer)
      timer=setTimeout(()=>cancel(new Error(`Nature texture timed out: ${key}`)),timeout)
    }
    const loaded=texture=>{
      if(expired){texture.dispose();return}
      cleanup()
      texture.name=`nature-${key}`
      texture.userData.managedByNatureAssets=true
      if(hdr){
        texture.mapping=THREE.EquirectangularReflectionMapping
      }else{
        texture.colorSpace=key.endsWith('-color')?THREE.SRGBColorSpace:THREE.NoColorSpace
        texture.wrapS=texture.wrapT=THREE.RepeatWrapping
        texture.anisotropy=4
        if(key.startsWith('leaf-')){
          texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping
          texture.repeat.x=.5
        }
      }
      assets.set(key,texture)
      resolve(texture)
    }
    const url=`${ROOT}${compact?'compact/':''}${key}.${hdr?'hdr':'jpg'}`
    requests.add(cancel)
    refresh()
    if(!strict){
      const loader=hdr?new RGBELoader():new THREE.TextureLoader()
      loader.load(url,loaded,undefined,cancel)
      return
    }
    ;(async()=>{
      try{
        const bytes=await downloadAsset(url,{signal:controller.signal,onActivity:refresh})
        if(expired) return
        if(hdr){
          const image=new RGBELoader().parse(bytes)
          const texture=new THREE.DataTexture(image.data,image.width,image.height,THREE.RGBAFormat,image.type)
          texture.colorSpace=THREE.LinearSRGBColorSpace
          texture.minFilter=texture.magFilter=THREE.LinearFilter
          texture.generateMipmaps=false
          texture.flipY=true
          texture.needsUpdate=true
          loaded(texture)
        }else{
          blobURL=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}))
          new THREE.TextureLoader().load(blobURL,loaded,undefined,cancel)
        }
      }catch(error){cancel(error)}
    })()
  })
}

/** Shared textures live until the last scene lease is released. Strict startup
 * requires every requested map; optional callers may retain fallback surfaces. */
export function preloadNatureAssets(options={}){
  leases++
  const required=['rock','grass','soil','bark','wood'].flatMap(kind=>
    ['color','normal','arm'].map(map=>[`${kind}-${map}`,false]))
  required.push(...['color','alpha','normal'].map(map=>[`leaf-${map}`,false]))
  required.push(['environment',true])
  if(options.sky!==false) required.push(['sky',true])
  const missing=()=>required.filter(([key])=>!assets.has(key))
  const validate=()=>{
    const failed=missing()
    if(options.strict&&failed.length) throw new Error(`Unable to load all landscape assets (${failed.length} missing). Please retry.`)
  }
  if(!pending&&!missing().length) return Promise.resolve()
  if(!pending){
    pending=Promise.allSettled(missing().map(([key,hdr])=>loadTexture(key,hdr,options))).then(results=>{
      const failed=results.filter(result=>result.status==='rejected')
      if(failed.length&&!options.strict) console.warn(`${failed.length} nature textures unavailable; using fallback surfaces.`)
    }).finally(()=>{pending=null;releaseUnused()})
  }
  return options.strict?pending.then(validate):pending
}

export function releaseNatureAssets(){
  leases=Math.max(0,leases-1)
  releaseUnused()
  queueMicrotask(()=>{
    if(!leases) requests.forEach(cancel=>cancel(new DOMException('Scene released','AbortError')))
  })
}
export const getNatureTexture=key=>assets.get(key)||null
export function getNatureSurface(kind){
  const source=kind==='wetrock'?'rock':kind
  const map=getNatureTexture(`${source}-color`)
  return map?{map,normalMap:getNatureTexture(`${source}-normal`),roughnessMap:getNatureTexture(`${source}-arm`)}:null
}
