/** Read one local asset completely before publishing it. Activity refreshes the
 * caller's watchdog, so a slow but progressing connection is not a failure. */
export async function downloadAsset(url,{signal,onActivity=()=>{}}={}){
  const response=await fetch(url,{signal})
  if(!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`)
  onActivity()
  if(!response.body?.getReader){
    const bytes=await response.arrayBuffer()
    onActivity()
    return bytes
  }
  const reader=response.body.getReader(),chunks=[]
  let length=0
  try{
    while(true){
      const {done,value}=await reader.read()
      if(done) break
      if(signal?.aborted) throw signal.reason||new DOMException('Aborted','AbortError')
      chunks.push(value)
      length+=value.byteLength
      onActivity()
    }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(length)
  let offset=0
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return bytes.buffer
}
