// Optimize already-downloaded, CC0 texture sources. See public/textures/nature/LICENSE.txt.
// Usage: node scripts/prepare-nature-assets.mjs /path/to/source
import { execFileSync } from 'node:child_process'
import { mkdirSync,copyFileSync,statSync,readFileSync,writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { FloatType } from 'three'

const source=resolve(process.argv[2]||'/tmp/tourism-surface-source')
const output=resolve('public/textures/nature')
mkdirSync(output,{recursive:true})
let bytes=0
for(const kind of ['rock','grass','soil','bark','wood']){
  for(const map of ['color','normal','arm']){
    const size=map==='color'?1024:512
    const destination=resolve(output,`${kind}-${map}.jpg`)
    execFileSync('sips',['-Z',String(size),'-s','formatOptions',map==='normal'?'84':'76',resolve(source,`${kind}-${map}.jpg`),'--out',destination],{stdio:'ignore'})
    bytes+=statSync(destination).size
  }
}
for(const [map,label] of [['color','Color'],['alpha','Opacity'],['normal','NormalGL']]){
  const destination=resolve(output,`leaf-${map}.jpg`)
  execFileSync('sips',['-Z','512','-s','formatOptions','88',resolve(source,`Leaf001_1K-JPG_${label}.jpg`),'--out',destination],{stdio:'ignore'})
  bytes+=statSync(destination).size
}
for(const kind of ['sky','environment']){
  const destination=resolve(output,`${kind}.hdr`)
  if(kind==='sky') copyFileSync(resolve(source,`${kind}-hdr.hdr`),destination)
  else{
    // Reflections are convolved to a small PMREM. Average linear radiance before
    // encoding, retaining HDR sun intensity without shipping unused resolution.
    const input=readFileSync(resolve(source,`${kind}-hdr.hdr`))
    const decoded=new RGBELoader().setDataType(FloatType).parse(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength))
    const width=decoded.width/2,height=decoded.height/2,pixels=Buffer.alloc(width*height*4)
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const rgb=[0,0,0]
      for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++){
        const offset=((y*2+dy)*decoded.width+x*2+dx)*4
        for(let channel=0;channel<3;channel++) rgb[channel]+=decoded.data[offset+channel]*.25
      }
      const peak=Math.max(...rgb),offset=(y*width+x)*4
      if(peak<1e-32) continue
      const exponent=Math.floor(Math.log2(peak))+1,scale=256/2**exponent
      for(let channel=0;channel<3;channel++) pixels[offset+channel]=Math.min(255,Math.round(rgb[channel]*scale))
      pixels[offset+3]=exponent+128
    }
    writeFileSync(destination,Buffer.concat([Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`),pixels]))
  }
  bytes+=statSync(destination).size
}
console.log(`Nature texture package: ${(bytes/1024/1024).toFixed(2)} MiB`)
