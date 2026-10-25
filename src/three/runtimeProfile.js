// Viewport controls composition. Hardware and connection hints only change cost.
export function getRuntimeProfile(width,device={}){
  const lowMemory=Number(device.deviceMemory)>0&&Number(device.deviceMemory)<=4
  const fewCores=Number(device.hardwareConcurrency)>0&&Number(device.hardwareConcurrency)<=4
  const constrainedDevice=lowMemory||fewCores
  const narrow=width<768
  return{
    quality:narrow||constrainedDevice?'mobile':'desktop',
    // Compact assets retain the same rig, materials and vehicle silhouette.
    // Use them even when a browser does not expose reliable connection hints.
    compactAssets:true,
    constrainedDevice,
    // Every connection receives the complete compact scene before Start.
    // Downloads refresh this inactivity watchdog whenever bytes arrive.
    loadSky:true,
    assetTimeout:120000,
  }
}

export const readRuntimeProfile=()=>getRuntimeProfile(
  typeof window==='undefined'?1440:window.innerWidth,
  typeof navigator==='undefined'?{}:navigator,
)
