// Derive smaller local variants from the licensed full-size assets. Requires macOS sips.
// Geometry positions and the traveller's rig remain unchanged.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js'
import {FloatType} from 'three'

const root=path.resolve('public')
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tourism-compact-'))
const nature=path.join(root,'textures/nature')
const compact=path.join(nature,'compact')
await fs.mkdir(compact,{recursive:true})
let textureBytes=0
for(const name of (await fs.readdir(nature)).filter(name=>name.endsWith('.jpg'))){
  const output=path.join(compact,name)
  const size=name.startsWith('leaf-')?256:name.endsWith('-color.jpg')?512:256
  execFileSync('sips',['-Z',String(size),'-s','formatOptions',name.includes('normal')?'78':'68',path.join(nature,name),'--out',output],{stdio:'ignore'})
  textureBytes+=(await fs.stat(output)).size
}
for(const name of ['sky','environment']){
  const input=await fs.readFile(path.join(nature,`${name}.hdr`))
  const decoded=new RGBELoader().setDataType(FloatType).parse(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength))
  const width=name==='sky'?512:128,height=width/2,step=decoded.width/width
  const pixels=Buffer.alloc(width*height*4)
  for(let y=0;y<height;y++) for(let x=0;x<width;x++){
    const rgb=[0,0,0]
    for(let dy=0;dy<step;dy++) for(let dx=0;dx<step;dx++){
      const source=((y*step+dy)*decoded.width+x*step+dx)*4
      for(let c=0;c<3;c++) rgb[c]+=decoded.data[source+c]/(step*step)
    }
    const peak=Math.max(...rgb),offset=(y*width+x)*4
    if(peak<1e-32) continue
    const exponent=Math.floor(Math.log2(peak))+1,scale=256/2**exponent
    for(let c=0;c<3;c++) pixels[offset+c]=Math.min(255,Math.round(rgb[c]*scale))
    pixels[offset+3]=exponent+128
  }
  const output=Buffer.concat([Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`),pixels])
  await fs.writeFile(path.join(compact,`${name}.hdr`),output)
  textureBytes+=output.length
}

const input=await fs.readFile(path.join(root,'models/traveller.glb'))
const jsonLength=input.readUInt32LE(12)
const gltf=JSON.parse(input.subarray(20,20+jsonLength))
const binary=input.subarray(28+jsonLength)
// These are already hidden by the runtime; exclude their bytes from the compact file.
gltf.nodes.forEach(node=>{if(/fine.?scalp.?roots|^Phone$|^teeth_base$/i.test(node.name||'')) delete node.mesh})
const meshIndices=[...new Set(gltf.nodes.flatMap(node=>node.mesh===undefined?[]:[node.mesh]))]
gltf.meshes=meshIndices.map(index=>gltf.meshes[index])
gltf.nodes.forEach(node=>{if(node.mesh!==undefined) node.mesh=meshIndices.indexOf(node.mesh)})
const usedAccessors=new Set()
for(const mesh of gltf.meshes) for(const p of mesh.primitives){
  Object.values(p.attributes).forEach(index=>usedAccessors.add(index))
  if(p.indices!==undefined) usedAccessors.add(p.indices)
  for(const target of p.targets||[]) Object.values(target).forEach(index=>usedAccessors.add(index))
}
gltf.skins?.forEach(skin=>{if(skin.inverseBindMatrices!==undefined) usedAccessors.add(skin.inverseBindMatrices)})
gltf.animations?.forEach(animation=>animation.samplers.forEach(sampler=>{usedAccessors.add(sampler.input);usedAccessors.add(sampler.output)}))
const accessorIndices=[...usedAccessors],remap=index=>accessorIndices.indexOf(index)
gltf.meshes.forEach(mesh=>mesh.primitives.forEach(p=>{
  for(const key of Object.keys(p.attributes)) p.attributes[key]=remap(p.attributes[key])
  if(p.indices!==undefined) p.indices=remap(p.indices)
  p.targets?.forEach(target=>{for(const key of Object.keys(target)) target[key]=remap(target[key])})
}))
gltf.skins?.forEach(skin=>{if(skin.inverseBindMatrices!==undefined) skin.inverseBindMatrices=remap(skin.inverseBindMatrices)})
gltf.animations?.forEach(animation=>animation.samplers.forEach(sampler=>{sampler.input=remap(sampler.input);sampler.output=remap(sampler.output)}))
gltf.accessors=accessorIndices.map(index=>gltf.accessors[index])
const replacements=new Map()
for(const [index,image] of gltf.images.entries()){
  const view=gltf.bufferViews[image.bufferView]
  const original=path.join(temporary,`${index}-source`),output=path.join(temporary,`${index}-compact`)
  await fs.writeFile(original,binary.subarray(view.byteOffset,view.byteOffset+view.byteLength))
  execFileSync('sips',['-Z','256',...(image.mimeType==='image/jpeg'?['-s','formatOptions','72']:[]),original,'--out',output],{stdio:'ignore'})
  replacements.set(image.bufferView,await fs.readFile(output))
}
// Normal quantization is supported natively by Three.js; no decoder download.
for(const mesh of gltf.meshes) for(const p of mesh.primitives) for(const key of ['NORMAL','WEIGHTS_0']){
  const a=gltf.accessors[p.attributes[key]]
  if(!a||a.componentType!==5126) continue
  const view=gltf.bufferViews[a.bufferView]
  if(view.byteStride) continue
  const count=a.count*(key==='NORMAL'?3:4)
  const source=binary.subarray(view.byteOffset+(a.byteOffset||0),view.byteOffset+(a.byteOffset||0)+count*4)
  const bytes=Buffer.alloc(count*2)
  for(let i=0;i<count;i++){
    const value=source.readFloatLE(i*4)
    if(key==='NORMAL') bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),i*2)
    else bytes.writeUInt16LE(Math.round(Math.max(0,Math.min(1,value))*65535),i*2)
  }
  replacements.set(a.bufferView,bytes)
  a.componentType=key==='NORMAL'?5122:5123;a.normalized=true;a.byteOffset=0
  delete a.min;delete a.max
}
gltf.extensionsUsed=[...new Set([...(gltf.extensionsUsed||[]),'KHR_mesh_quantization'])]
gltf.extensionsRequired=[...new Set([...(gltf.extensionsRequired||[]),'KHR_mesh_quantization'])]
const usedViews=[...new Set([...gltf.accessors.map(a=>a.bufferView),...gltf.images.map(i=>i.bufferView)])]
const chunks=[];let offset=0
const views=usedViews.map(index=>{
  const view=gltf.bufferViews[index]
  const bytes=replacements.get(index)||binary.subarray(view.byteOffset,view.byteOffset+view.byteLength)
  const result={...view,byteOffset:offset,byteLength:bytes.length}
  chunks.push(bytes);offset+=bytes.length
  const padding=(4-offset%4)%4
  if(padding){chunks.push(Buffer.alloc(padding));offset+=padding}
  return result
})
gltf.accessors.forEach(a=>{a.bufferView=usedViews.indexOf(a.bufferView)})
gltf.images.forEach(i=>{i.bufferView=usedViews.indexOf(i.bufferView)})
gltf.bufferViews=views;gltf.buffers[0].byteLength=offset
const json=Buffer.from(JSON.stringify(gltf)),length=Math.ceil(json.length/4)*4
const output=Buffer.alloc(28+length+offset)
output.write('glTF');output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8)
output.writeUInt32LE(length,12);output.writeUInt32LE(0x4e4f534a,16);output.fill(32,20,20+length);json.copy(output,20)
output.writeUInt32LE(offset,20+length);output.writeUInt32LE(0x004e4942,24+length);Buffer.concat(chunks).copy(output,28+length)
await fs.writeFile(path.join(root,'models/traveller-compact.glb'),output)
await fs.rm(temporary,{recursive:true,force:true})
console.log(`Compact textures: ${(textureBytes/1048576).toFixed(2)} MiB; traveller: ${(output.length/1048576).toFixed(2)} MiB`)
