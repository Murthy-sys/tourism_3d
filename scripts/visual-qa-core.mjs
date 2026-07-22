const ACTIVE_THRESHOLD=.05

export const CANVAS_ISOLATION_STYLE=`
  .experience__stage > :not(.journey__canvas),
  .experience > :not(.experience__track) {
    visibility: hidden !important;
  }
`

export const FRAME_CONTRACTS={
  'forest-water-transition':{progress:.595,zones:['forest','water'],transports:['jeep','boat'],viewportTransports:['jeep','boat'],party:false},
  'water-corridor':{progress:.66,zones:['water'],transports:['boat'],viewportTransports:['boat'],party:false},
  'water-hill-transition':{progress:.725,zones:['hills','water'],transports:['boat','trekker'],viewportTransports:['boat','trekker'],party:true},
  'hill-reveal':{progress:.79,zones:['hills'],transports:['trekker'],viewportTransports:['trekker'],party:true},
  'trekking-party':{progress:.82,zones:['hills'],transports:['trekker'],party:true,screenParty:true},
  'hill-contact':{progress:.96,zones:['hills'],transports:['trekker'],party:true},
}

const activeNames=weights=>Object.entries(weights||{})
  .filter(([,weight])=>Number.isFinite(weight)&&weight>ACTIVE_THRESHOLD)
  .map(([name])=>name)
  .sort()

export function validateFrameContract(name,qa,mode){
  const contract=FRAME_CONTRACTS[name]
  if(!contract)return[`${name}: no frame contract exists`]
  const failures=[]
  const zones=activeNames(qa.zoneWeights)
  const transports=activeNames(qa.transportWeights)
  if(JSON.stringify(zones)!==JSON.stringify([...contract.zones].sort()))failures.push(`${name}: zones expected ${contract.zones.join('+')}, received ${zones.join('+')||'none'}`)
  if(JSON.stringify(transports)!==JSON.stringify([...contract.transports].sort()))failures.push(`${name}: transports expected ${contract.transports.join('+')}, received ${transports.join('+')||'none'}`)
  if(qa.iceObjects!==0)failures.push(`${name}: expected zero snow/ice objects, received ${qa.iceObjects}`)
  const expectedParty=contract.party?{guides:1,tourists:3,walkers:4}:{guides:0,tourists:0,walkers:0}
  if(qa.guides!==expectedParty.guides)failures.push(`${name}: expected ${expectedParty.guides} renderable guides, received ${qa.guides}`)
  if(qa.tourists!==expectedParty.tourists)failures.push(`${name}: expected ${expectedParty.tourists} renderable tourists, received ${qa.tourists}`)
  if(qa.walkersOnTrail!==expectedParty.walkers)failures.push(`${name}: expected ${expectedParty.walkers} renderable walkers on trail, received ${qa.walkersOnTrail}`)
  ;(contract.viewportTransports||[]).forEach(transport=>{
    if(!qa.transports?.find(candidate=>candidate.name===transport)?.visible)failures.push(`${name}: ${transport} renderable center is outside the viewport`)
  })
  if(contract.screenParty){
    if(qa.visibleMembers?.guides!==1)failures.push(`${name}: expected one guide inside the viewport`)
    const tourists=mode==='mobile'?2:3
    if((qa.visibleMembers?.tourists||0)<tourists)failures.push(`${name}: expected ${mode==='mobile'?'at least two':'three'} tourists inside the viewport`)
  }
  return failures
}

export function analyzeRgbaPixels(rgba,width,height){
  const pixelCount=Math.max(1,width*height)
  let opaque=0,minLuminance=255,maxLuminance=0
  const buckets=new Set()
  for(let index=0;index<pixelCount;index++){
    const offset=index*4,r=rgba[offset]||0,g=rgba[offset+1]||0,b=rgba[offset+2]||0,a=rgba[offset+3]||0
    if(a>24)opaque++
    const luminance=.2126*r+.7152*g+.0722*b
    minLuminance=Math.min(minLuminance,luminance)
    maxLuminance=Math.max(maxLuminance,luminance)
    buckets.add(`${r>>4}-${g>>4}-${b>>4}-${a>>6}`)
  }
  const opaqueRatio=opaque/pixelCount
  const luminanceRange=maxLuminance-minLuminance
  const uniqueBuckets=buckets.size
  return{width,height,opaqueRatio,luminanceRange,uniqueBuckets,blank:opaqueRatio<.8||luminanceRange<12||uniqueBuckets<8}
}

export function validateCanvasEvidence({presentation,pixels}){
  const failures=[]
  if(!presentation?.visible||presentation.width<=0||presentation.height<=0)failures.push('canvas is not visible with positive dimensions')
  if(!pixels||pixels.blank)failures.push('canvas render pixels are blank or lack a real color/luminance histogram')
  return failures
}
