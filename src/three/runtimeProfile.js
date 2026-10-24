// Viewport controls composition. Hardware and connection hints only change cost.
export function getRuntimeProfile(width,device={}){
  const connection=device.connection||{}
  const lowMemory=Number(device.deviceMemory)>0&&Number(device.deviceMemory)<=4
  const fewCores=Number(device.hardwareConcurrency)>0&&Number(device.hardwareConcurrency)<=4
  const constrainedDevice=lowMemory||fewCores
  const narrow=width<768
  const slowConnection=Boolean(connection.saveData)||/^(slow-2g|2g|3g)$/.test(connection.effectiveType||'')||
    (Number(connection.downlink)>0&&Number(connection.downlink)<3)
  return{
    quality:narrow||constrainedDevice?'mobile':'desktop',
    compactAssets:narrow||constrainedDevice||slowConnection,
    constrainedDevice,
    assetTimeout:12000,
  }
}

export const readRuntimeProfile=()=>getRuntimeProfile(
  typeof window==='undefined'?1440:window.innerWidth,
  typeof navigator==='undefined'?{}:navigator,
)
