// Rebuild the licensed source GLB with web-sized textures. Requires macOS sips.
// Usage: node scripts/prepare-traveller.mjs /path/to/source.glb
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const source = process.argv[2]
if (!source) throw new Error('Provide the original Sam GLB path; see public/models/LICENSE.txt')
const input = await fs.readFile(source)
const jsonLength = input.readUInt32LE(12)
const gltf = JSON.parse(input.subarray(20,20+jsonLength).toString())
const binary = input.subarray(28+jsonLength)
const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'traveller-textures-'))
const replacements = new Map()
const settings = [[256,'png'],[256,'png'],[128,'png'],[256,'jpeg'],[1024,'jpeg'],[1024,'jpeg'],[512,'jpeg'],[512,'jpeg'],[512,'png'],[256,'jpeg']]

for (const [index,image] of gltf.images.entries()) {
  const view = gltf.bufferViews[image.bufferView]
  const original = path.join(temporary,`${index}-source.png`)
  const [size,format] = settings[index]
  const output = path.join(temporary,`${index}.${format}`)
  await fs.writeFile(original,binary.subarray(view.byteOffset,view.byteOffset+view.byteLength))
  execFileSync('sips',['-Z',String(size),'-s','format',format,...(format==='jpeg'?['-s','formatOptions','86']:[]),original,'--out',output],{stdio:'ignore'})
  replacements.set(image.bufferView,await fs.readFile(output))
  image.mimeType = `image/${format}`
}

const chunks = []
let offset = 0
for (const [index,view] of gltf.bufferViews.entries()) {
  const data = replacements.get(index) || binary.subarray(view.byteOffset,view.byteOffset+view.byteLength)
  view.byteOffset = offset
  view.byteLength = data.length
  chunks.push(data)
  offset += data.length
  const padding = (4-offset%4)%4
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding }
}
gltf.buffers[0].byteLength = offset
gltf.asset.copyright = 'Sam by Innerscene / MakeHuman / MPFB. CC0-1.0. See LICENSE.txt.'
const json = Buffer.from(JSON.stringify(gltf))
const paddedJSON = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)])
const output = Buffer.alloc(28+paddedJSON.length+offset)
output.write('glTF',0)
output.writeUInt32LE(2,4)
output.writeUInt32LE(output.length,8)
output.writeUInt32LE(paddedJSON.length,12)
output.writeUInt32LE(0x4e4f534a,16)
paddedJSON.copy(output,20)
output.writeUInt32LE(offset,20+paddedJSON.length)
output.writeUInt32LE(0x004e4942,24+paddedJSON.length)
Buffer.concat(chunks).copy(output,28+paddedJSON.length)
await fs.writeFile(new URL('../public/models/traveller.glb',import.meta.url),output)
await fs.rm(temporary,{recursive:true,force:true})
console.log(`Traveller: ${(input.length/1048576).toFixed(2)} → ${(output.length/1048576).toFixed(2)} MiB`)
