import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

const ROOT=`${import.meta.env?.BASE_URL||'/'}textures/nature/`
const TIMEOUT=20000
const assets=new Map()
let pending=null,leases=0

function releaseUnused(){
  if(leases||pending) return
  assets.forEach(texture=>texture.dispose())
  assets.clear()
}

function loadTexture(key,hdr=false,{compact=false,timeout=TIMEOUT}={}){
  return new Promise((resolve,reject)=>{
    let expired=false
    const timer=setTimeout(()=>{expired=true;reject(new Error(`Nature texture timed out: ${key}`))},timeout)
    const loader=hdr?new RGBELoader():new THREE.TextureLoader()
    loader.load(`${ROOT}${compact?'compact/':''}${key}.${hdr?'hdr':'jpg'}`,texture=>{
      clearTimeout(timer)
      if(expired){texture.dispose();return}
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
    },undefined,error=>{clearTimeout(timer);if(!expired) reject(error)})
  })
}

/** Shared textures live until the last scene lease is released. A failed map
 * leaves its procedural fallback available and never blocks the start gate. */
export function preloadNatureAssets(options={}){
  leases++
  if(!pending&&assets.size) return Promise.resolve()
  if(!pending){
    const requests=['rock','grass','soil','bark','wood'].flatMap(kind=>
      ['color','normal','arm'].map(map=>loadTexture(`${kind}-${map}`,false,options)))
    requests.push(...['color','alpha','normal'].map(map=>loadTexture(`leaf-${map}`,false,options)))
    requests.push(loadTexture('sky',true,options),loadTexture('environment',true,options))
    pending=Promise.allSettled(requests).then(results=>{
      const failed=results.filter(result=>result.status==='rejected')
      if(failed.length) console.warn(`${failed.length} nature textures unavailable; using fallback surfaces.`)
    }).finally(()=>{pending=null;releaseUnused()})
  }
  return pending
}

export function releaseNatureAssets(){leases=Math.max(0,leases-1);releaseUnused()}
export const getNatureTexture=key=>assets.get(key)||null
export function getNatureSurface(kind){
  const source=kind==='wetrock'?'rock':kind
  const map=getNatureTexture(`${source}-color`)
  return map?{map,normalMap:getNatureTexture(`${source}-normal`),roughnessMap:getNatureTexture(`${source}-arm`)}:null
}
