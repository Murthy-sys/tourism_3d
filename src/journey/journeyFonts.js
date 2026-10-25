import { downloadAsset } from '../three/assetDownload'

const baseURL=import.meta.env?.BASE_URL||'/'
const fontFiles=[
  ['Bebas Neue','bebas-neue-latin.woff2',{weight:'400'}],
  ['Manrope','manrope-latin-variable.woff2',{weight:'300 800'}],
]
const loaded=new Map(),requests=new Set()
let leases=0,pending=null

function loadFont([family,file,descriptors],timeout){
  if(loaded.has(family)) return Promise.resolve()
  return new Promise((resolve,reject)=>{
    const controller=new AbortController()
    let cancelled=false,timer
    const cancel=error=>{
      if(cancelled) return
      cancelled=true
      controller.abort()
      clearTimeout(timer)
      requests.delete(cancel)
      reject(error)
    }
    const refresh=()=>{
      if(cancelled) return
      clearTimeout(timer)
      timer=setTimeout(()=>cancel(new Error('Journey fonts loading timed out')),timeout)
    }
    requests.add(cancel)
    refresh()
    ;(async()=>{
      try{
        const bytes=await downloadAsset(`${baseURL}fonts/${file}`,{signal:controller.signal,onActivity:refresh})
        if(cancelled) return
        const face=await new FontFace(family,bytes,descriptors).load()
        if(cancelled) return
        document.fonts.add(face)
        loaded.set(family,face)
        resolve()
      }catch(error){if(!cancelled) reject(error)}
      finally{clearTimeout(timer);requests.delete(cancel)}
    })()
  })
}

// Loaded fonts stay with the document so retries never swap visible text back
// to a fallback. Only abandoned downloads are cancelled on scene cleanup.
export function preloadJourneyFonts({timeout=120000}={}){
  leases++
  if(typeof FontFace==='undefined'||!document.fonts?.add) return Promise.resolve()
  if(!pending) pending=Promise.all(fontFiles.map(font=>loadFont(font,timeout))).finally(()=>{pending=null})
  return pending
}

export function releaseJourneyFonts(){
  leases=Math.max(0,leases-1)
  queueMicrotask(()=>{
    if(!leases) requests.forEach(cancel=>cancel(new DOMException('Scene released','AbortError')))
  })
}
