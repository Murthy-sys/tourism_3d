// Consolidate the CC0 source assemblies while preserving wheels and entry leaves.
// Usage: node scripts/prepare-vehicles.mjs /path/to/utility-jeep.glb /path/to/city-bus.glb
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const [jeepPath,busPath]=process.argv.slice(2)
if(!jeepPath||!busPath) throw new Error('Provide the original utility jeep and 12 m city bus GLBs; see public/models/LICENSE.txt')
const pack=(json,binary)=>{
  const text=Buffer.from(JSON.stringify(json)),length=Math.ceil(text.length/4)*4
  const bytes=Buffer.alloc(28+length+binary.length)
  bytes.write('glTF');bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8)
  bytes.writeUInt32LE(length,12);bytes.writeUInt32LE(0x4e4f534a,16);bytes.fill(32,20,20+length);text.copy(bytes,20)
  bytes.writeUInt32LE(binary.length,20+length);bytes.writeUInt32LE(0x004e4942,24+length);binary.copy(bytes,28+length)
  return bytes
}
const stripTextures=value=>{
  for(const [key,child] of Object.entries(value||{})){
    if(/Texture$/.test(key)) delete value[key]
    else if(child&&typeof child==='object') stripTextures(child)
  }
}
const color=hex=>new THREE.Color(hex).toArray()

async function prepare(filename,kind,mobile=false){
  const input=await fs.readFile(filename),jsonLength=input.readUInt32LE(12)
  const source=JSON.parse(input.subarray(20,20+jsonLength)),binary=input.subarray(28+jsonLength)
  const parseJSON=structuredClone(source)
  parseJSON.materials.forEach(stripTextures)
  const parseBytes=pack(parseJSON,binary)
  const gltf=await new GLTFLoader().parseAsync(parseBytes.buffer.slice(parseBytes.byteOffset,parseBytes.byteOffset+parseBytes.byteLength),'')
  gltf.scene.updateMatrixWorld(true)
  const sourceBounds=new THREE.Box3().setFromObject(gltf.scene)
  const scale=kind==='jeep'?1.12:11.8/sourceBounds.getSize(new THREE.Vector3()).x
  const rotation=new THREE.Matrix4().makeRotationY(kind==='jeep'?Math.PI:-Math.PI/2)
  const transform=rotation.multiply(new THREE.Matrix4().makeScale(scale,scale,kind==='jeep'?scale:-scale))
  transform.setPosition(0,-sourceBounds.min.y*scale,0)
  const sourceOffset=gltf.scene.children[0].position.y
  const wheelSpecs=kind==='jeep'
    ?[-.67,.67].flatMap(x=>[1.04,-.98].map(z=>new THREE.Vector3(x,.35+sourceOffset,z)))
    :[-1.2388,1.2388].flatMap(z=>[-3.68,3.52].map(x=>new THREE.Vector3(x,.49+sourceOffset,z)))
  const wheels=wheelSpecs.map(point=>point.clone().applyMatrix4(transform))
  const parts=new Map(),meshMetadata=[],seatBounds=[]
  const getPart=name=>{
    if(!parts.has(name)) parts.set(name,new Map())
    return parts.get(name)
  }
  gltf.scene.traverse(object=>{
    if(!object.isMesh) return
    const association=gltf.parser.associations.get(object)
    const original=source.nodes[association.nodes]?.name||object.name.replaceAll('_',' ')
    const bounds=new THREE.Box3().setFromObject(object),center=bounds.getCenter(new THREE.Vector3())
    if(kind==='bus'&&/Destination sign:|headrest pin|Truck tire transverse siping|Heavy wheel lug washer|Heavy vehicle brake disc|Heavy wheel brake hat|Grille inner vertical mesh|Dashboard vent slat/.test(original)) return
    if(kind==='bus'&&mobile&&/Passenger vertical grab pole|Passenger overhead grab rail|HVAC condenser fin|Seat pedestal|seat pedestal/.test(original)) return
    if(kind==='jeep'&&/^Seat cushion/.test(original)) seatBounds.push({center:center.clone().applyMatrix4(transform).toArray(),top:bounds.max.y*scale+transform.elements[13]})
    const isWheel=kind==='jeep'
      ?/^(Molded tire tread|Pressed steel wheel disc|Profiled closed tire casing|Raised rim flange|Seated closed wheel rim barrel|Seated wheel nut|Wheel axle hub)/.test(original)
      :/tire|wheel|rim|lug|brake|bearing/i.test(original)&&!/wheel arch|wheel house|underfloor/i.test(original)
    let part='body',pivot=new THREE.Vector3()
    if(isWheel){
      let nearest=Infinity,wheelIndex=-1
      wheelSpecs.forEach((wheel,index)=>{const distance=center.distanceTo(wheel);if(distance<nearest){nearest=distance;wheelIndex=index}})
      if(nearest<(kind==='jeep'?.62:.85)){
        if(kind==='bus'&&mobile&&center.x>2&&Math.abs(center.z)<1.1) return
        part=`wheel-${wheelIndex}`
        pivot=wheels[wheelIndex]
      }
    }
    if(kind==='bus'&&/Door leaf|Door yellow|Entry leaf|Transparent entry door/.test(original)&&center.x<-4&&center.z>0){
      const leaf=center.x<-4.8?0:1
      part=`entry-${leaf}`
      pivot=new THREE.Vector3(leaf===0?-5.35:-4.25,1.3,1.25).applyMatrix4(transform)
    }
    const geometry=object.geometry.clone().applyMatrix4(transform.clone().multiply(object.matrixWorld))
    geometry.translate(-pivot.x,-pivot.y,-pivot.z)
    if(transform.determinant()<0){
      const index=geometry.index.array
      for(let i=0;i<index.length;i+=3){const swap=index[i+1];index[i+1]=index[i+2];index[i+2]=swap}
    }
    for(const attribute of Object.keys(geometry.attributes)) if(!['position','normal','uv'].includes(attribute)) geometry.deleteAttribute(attribute)
    if(!geometry.attributes.uv) geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2))
    const material=association.materials??source.meshes[association.meshes].primitives[association.primitives||0].material
    const group=getPart(part)
    if(!group.has(material)) group.set(material,{geometries:[],pivot})
    group.get(material).geometries.push(geometry)
    meshMetadata.push({name:original,part})
  })

  const materials=structuredClone(source.materials)
  materials.forEach(material=>{
    const pbr=material.pbrMetallicRoughness||={}
    const name=material.name
    if(/olive|^paint$/.test(name)){
      delete pbr.baseColorTexture
      pbr.baseColorFactor=[...color(kind==='jeep'?'#596049':'#b8bcb3'),1]
      pbr.roughnessFactor=.43;pbr.metallicFactor=.16
      material.extensions={KHR_materials_clearcoat:{clearcoatFactor:.28,clearcoatRoughnessFactor:.32}}
    }else if(/glass|clearlens/.test(name)){
      delete pbr.baseColorTexture
      pbr.baseColorFactor=[...color('#9eafb1'),/glass/.test(name)?.4:.63]
      pbr.roughnessFactor=.13;pbr.metallicFactor=.04
      material.alphaMode='BLEND';material.doubleSided=false;delete material.extensions
    }else if(!/canvas|leather|interior|dial/.test(name)){
      delete pbr.baseColorTexture
      pbr.baseColorFactor=[...color(/rubber/.test(name)?'#242724':/black/.test(name)?'#30352f':/red/.test(name)?'#7b231d':/amber/.test(name)?'#ad6b24':'#8b9391'),1]
      if(/rubber/.test(name)){pbr.roughnessFactor=.94;pbr.metallicFactor=0}
    }
  })
  const output={asset:{version:'2.0',generator:'Tourism vehicle preparation',copyright:'Innerscene original model. CC0-1.0. See LICENSE.txt.'},extensionsUsed:['KHR_materials_clearcoat','KHR_mesh_quantization'],extensionsRequired:['KHR_mesh_quantization'],scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials,buffers:[{byteLength:0}],bufferViews:[],accessors:[],textures:[],images:[],samplers:source.samplers||[]}
  const chunks=[];let offset=0
  const addBuffer=(bytes,target)=>{
    const index=output.bufferViews.length
    output.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...(target?{target}:{})})
    chunks.push(bytes);offset+=bytes.length
    const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding}
    return index
  }
  const textureMap=new Map(),imageMap=new Map(),compressed=new Map()
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'tourism-vehicle-textures-'))
  for(const [index,image] of source.images.entries()){
    const view=source.bufferViews[image.bufferView]
    if(view.byteLength<100000) continue
    const original=path.join(temporary,`${index}.png`),target=path.join(temporary,`${index}.jpg`)
    await fs.writeFile(original,binary.subarray(view.byteOffset,view.byteOffset+view.byteLength))
    execFileSync('sips',['-Z','512','-s','format','jpeg','-s','formatOptions','82',original,'--out',target],{stdio:'ignore'})
    compressed.set(index,await fs.readFile(target))
  }
  const rewriteTextures=value=>{
    for(const [key,child] of Object.entries(value||{})){
      if(/Texture$/.test(key)&&child?.index!=null){
        const old=child.index
        if(!textureMap.has(old)){
          const texture=structuredClone(source.textures[old])
          if(!imageMap.has(texture.source)){
            const image=structuredClone(source.images[texture.source]),view=source.bufferViews[image.bufferView]
            imageMap.set(texture.source,output.images.length)
            const replacement=compressed.get(texture.source)
            if(replacement) image.mimeType='image/jpeg'
            image.bufferView=addBuffer(replacement||binary.subarray(view.byteOffset,view.byteOffset+view.byteLength))
            output.images.push(image)
          }
          texture.source=imageMap.get(texture.source)
          textureMap.set(old,output.textures.length);output.textures.push(texture)
        }
        child.index=textureMap.get(old)
      }else if(child&&typeof child==='object') rewriteTextures(child)
    }
  }
  materials.forEach(rewriteTextures)
  const attribute=(array,size,componentType,type,bounds,normalized=false)=>{
    const view=addBuffer(Buffer.from(array.buffer,array.byteOffset,array.byteLength),type==='SCALAR'?34963:34962)
    const index=output.accessors.length
    output.accessors.push({bufferView:view,componentType,count:array.length/size,type,...bounds,...(normalized?{normalized:true}:{})})
    return index
  }
  const sourceSeats=seatBounds.sort((a,b)=>a.center[2]-b.center[2])
  const frontSeats=sourceSeats.slice(0,2).sort((a,b)=>b.center[0]-a.center[0])
  const rearSeat=sourceSeats[2]
  const specs={kind,quality:mobile?'mobile':'desktop',scale,forward:[0,0,-1],wheelCenters:wheels.map(point=>point.toArray()),
    seats:kind==='jeep'?[...frontSeats.map(seat=>[seat.center[0],seat.top+.04,seat.center[2]]),...[1,-1].map(side=>[side*.27*scale,rearSeat.top+.04,rearSeat.center[2]])]:[],
    sourceParts:meshMetadata.length,
  }
  output.nodes.push({name:`${kind}-asset`,children:[],extras:{vehicleSpecs:specs}})
  let triangles=0
  for(const [name,groups] of parts){
    const node=output.nodes.length,pivot=[...groups.values()][0].pivot
    output.nodes[0].children.push(node)
    output.nodes.push({name,translation:pivot.toArray(),children:[]})
    for(const [material,{geometries}] of groups){
      const geometry=mergeGeometries(geometries)
      geometries.forEach(part=>part.dispose())
      geometry.computeBoundingBox()
      const attributes={}
      const minimum=geometry.boundingBox.min,size=geometry.boundingBox.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-6,1e-6,1e-6))
      const position=geometry.attributes.position,normal=geometry.attributes.normal
      const positions=new Uint16Array(position.count*3),normals=new Int16Array(normal.count*3),direction=new THREE.Vector3()
      for(let index=0;index<position.count;index++){
        for(let axis=0;axis<3;axis++) positions[index*3+axis]=Math.round((position.array[index*3+axis]-minimum.getComponent(axis))/size.getComponent(axis)*65535)
        // The node's non-uniform decode scale is reversed by normalMatrix.
        direction.fromBufferAttribute(normal,index).multiply(size).normalize()
        for(let axis=0;axis<3;axis++) normals[index*3+axis]=Math.round(direction.getComponent(axis)*32767)
      }
      attributes.POSITION=attribute(positions,3,5123,'VEC3',{min:[0,0,0],max:[65535,65535,65535]},true)
      attributes.NORMAL=attribute(normals,3,5122,'VEC3',undefined,true)
      attributes.TEXCOORD_0=attribute(new Float32Array(geometry.attributes.uv.array),2,5126,'VEC2')
      const smallIndices=position.count<65536
      const indices=attribute(smallIndices?new Uint16Array(geometry.index.array):new Uint32Array(geometry.index.array),1,smallIndices?5123:5125,'SCALAR')
      triangles+=geometry.index.count/3
      const mesh=output.meshes.length
      output.meshes.push({name:`${name}-${materials[material].name}`,primitives:[{attributes,indices,material}]})
      output.nodes[node].children.push(output.nodes.length)
      output.nodes.push({name:`${name}-${materials[material].name}`,mesh,translation:minimum.toArray(),scale:size.toArray()})
      geometry.dispose()
    }
  }
  output.buffers[0].byteLength=offset
  const result=pack(output,Buffer.concat(chunks))
  const target=kind==='jeep'?'utility-jeep.glb':`tour-bus${mobile?'-mobile':''}.glb`
  await fs.writeFile(new URL(`../public/models/${target}`,import.meta.url),result)
  await fs.rm(temporary,{recursive:true,force:true})
  console.log(`${target}: ${(result.length/1048576).toFixed(2)} MiB, ${output.meshes.length} draws, ${triangles} triangles`)
}

await prepare(jeepPath,'jeep')
await prepare(busPath,'bus')
await prepare(busPath,'bus',true)
