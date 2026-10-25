// Resize embedded wildlife textures without changing topology, UVs or transforms.
// Requires macOS sips, matching the project's existing asset preparation tools.
// Usage: node scripts/prepare-wildlife.mjs /path/to/deer.glb /path/to/boar.glb
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const inputs=process.argv.slice(2)
if(inputs.length!==2) throw new Error('Provide the original deer and boar GLBs; see public/models/LICENSE.txt')

function unpack(bytes){
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2) throw new Error('Expected a glTF 2.0 binary')
  let json,binary
  for(let offset=12;offset<bytes.length;){
    const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4)
    const chunk=bytes.subarray(offset+8,offset+8+length)
    if(type===0x4e4f534a) json=JSON.parse(chunk.toString())
    if(type===0x004e4942) binary=chunk
    offset+=8+length
  }
  if(!json||!binary||json.buffers.length!==1||json.buffers[0].uri) throw new Error('Expected one embedded binary buffer')
  return{json,binary}
}

function pack(json,binary){
  const encoded=Buffer.from(JSON.stringify(json)),jsonLength=Math.ceil(encoded.length/4)*4
  const output=Buffer.alloc(28+jsonLength+binary.length)
  output.write('glTF');output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8)
  output.writeUInt32LE(jsonLength,12);output.writeUInt32LE(0x4e4f534a,16)
  output.fill(32,20,20+jsonLength);encoded.copy(output,20)
  output.writeUInt32LE(binary.length,20+jsonLength);output.writeUInt32LE(0x004e4942,24+jsonLength)
  binary.copy(output,28+jsonLength)
  return output
}

const stripTextures=value=>{
  for(const [key,child] of Object.entries(value||{})){
    if(/Texture$/.test(key)) delete value[key]
    else if(child&&typeof child==='object') stripTextures(child)
  }
}

async function prepare(filename,kind){
  const input=await fs.readFile(filename),{json,binary}=unpack(input)
  const colorImages=new Set()
  for(const material of json.materials||[]){
    for(const texture of [material.pbrMetallicRoughness?.baseColorTexture,material.emissiveTexture]){
      if(texture) colorImages.add(json.textures[texture.index].source)
    }
  }
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tourism-wildlife-'))
  const replacements=new Map(),textureReport=[]
  try{
    for(const [index,image] of (json.images||[]).entries()){
      if(image.bufferView===undefined) throw new Error('Wildlife textures must be embedded')
      const view=json.bufferViews[image.bufferView]
      const source=path.join(temporary,`${index}-source`)
      await fs.writeFile(source,binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength))
      const info=execFileSync('sips',['-g','hasAlpha','-g','pixelWidth','-g','pixelHeight',source],{encoding:'utf8'})
      const alpha=/hasAlpha:\s*yes/.test(info)
      const width=Number(info.match(/pixelWidth:\s*(\d+)/)?.[1])
      const height=Number(info.match(/pixelHeight:\s*(\d+)/)?.[1])
      if(!width||!height) throw new Error(`Cannot inspect wildlife image ${index}`)
      const maximum=colorImages.has(index)?1024:512
      const format=alpha?'png':'jpeg',target=path.join(temporary,`${index}.${alpha?'png':'jpg'}`)
      execFileSync('sips',[
        ...(Math.max(width,height)>maximum?['-Z',String(maximum)]:[]),
        '-s','format',format,...(!alpha?['-s','formatOptions','85']:[]),source,'--out',target,
      ],{stdio:'ignore'})
      const result=await fs.readFile(target)
      replacements.set(image.bufferView,result)
      image.mimeType=`image/${format}`
      textureReport.push({role:colorImages.has(index)?'color':'normal-or-ORM',maximum,alpha,bytes:result.length})
    }
    const chunks=[];let offset=0
    json.bufferViews=json.bufferViews.map((view,index)=>{
      if(view.buffer!==0) throw new Error('Unexpected external buffer')
      const originalOffset=view.byteOffset||0
      const bytes=replacements.get(index)||binary.subarray(originalOffset,originalOffset+view.byteLength)
      const result={...view,byteOffset:offset,byteLength:bytes.length}
      chunks.push(bytes);offset+=bytes.length
      const padding=(4-offset%4)%4
      if(padding){chunks.push(Buffer.alloc(padding));offset+=padding}
      return result
    })
    json.buffers[0].byteLength=offset
    json.asset.generator=`${json.asset.generator||'glTF'}; Tourism wildlife texture preparation`
    json.asset.extras={...json.asset.extras,localModifications:'Color maps resized to at most 1024px; normal/ORM maps to at most 512px. Opaque maps encoded as JPEG quality 85. Original mesh topology, UVs, transforms and normal maps retained.'}
    const output=pack(json,Buffer.concat(chunks))
    await fs.writeFile(new URL(`../public/models/forest-${kind}.glb`,import.meta.url),output)

    // Inspect bounds using the real hierarchy without decoding textures in Node.
    const inspection=structuredClone(json)
    inspection.materials?.forEach(stripTextures)
    const inspectionBytes=pack(inspection,Buffer.concat(chunks))
    const gltf=await new GLTFLoader().parseAsync(inspectionBytes.buffer.slice(inspectionBytes.byteOffset,inspectionBytes.byteOffset+inspectionBytes.byteLength),'')
    gltf.scene.updateMatrixWorld(true)
    const bounds=new THREE.Box3().setFromObject(gltf.scene)
    const triangles=json.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((total,primitive)=>total+(primitive.indices===undefined?json.accessors[primitive.attributes.POSITION].count:json.accessors[primitive.indices].count)/3,0),0)
    console.log(JSON.stringify({file:`forest-${kind}.glb`,bytes:output.length,triangles,textureReport,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new THREE.Vector3()).toArray()}}))
    gltf.scene.traverse(object=>{object.geometry?.dispose();if(object.material) for(const material of Array.isArray(object.material)?object.material:[object.material]) material.dispose()})
  }finally{
    await fs.rm(temporary,{recursive:true,force:true})
  }
}

await prepare(inputs[0],'deer')
await prepare(inputs[1],'boar')
