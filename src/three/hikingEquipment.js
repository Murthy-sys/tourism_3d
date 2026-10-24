import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mesh } from './primitives'

const box=(w,h,d,r=.018)=>new RoundedBoxGeometry(w,h,d,2,r)
const part=(name,geometry,material,position)=>{
  const object=mesh(geometry,material,position)
  object.name=name
  return object
}
const combine=(name,geometries,material)=>{
  const normalized=geometries.map(value=>value.index?value.toNonIndexed():value)
  const geometry=mergeGeometries(normalized)
  new Set([...geometries,...normalized]).forEach(value=>value.dispose())
  return part(name,geometry,material,[0,0,0])
}
const webbing=(points,width)=>{
  const shape=new THREE.Shape()
  shape.moveTo(-width/2,-.003)
  shape.lineTo(width/2,-.003)
  shape.lineTo(width/2,.003)
  shape.lineTo(-width/2,.003)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape,{
    steps:12,bevelEnabled:false,
    extrudePath:new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point))),
  })
}

export function createHikingBackpack(palette){
  const pack=new THREE.Group()
  pack.name='backpack'
  pack.position.set(0,1.14,-.17)
  const weave=new Uint8Array(32*32*4)
  for(let y=0;y<32;y++) for(let x=0;x<32;x++){
    const value=((x+y)%4<2?176:215)+(x%3===0?-12:0)
    const offset=(y*32+x)*4
    weave.set([value,value,value,255],offset)
  }
  const texture=new THREE.DataTexture(weave,32,32)
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.repeat.set(24,24)
  texture.generateMipmaps=true
  texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.magFilter=THREE.LinearFilter
  texture.needsUpdate=true
  texture.userData.ownedByCharacter=true
  const fabric=new THREE.MeshStandardMaterial({color:palette.pack,roughness:.9,bumpMap:texture,bumpScale:.0012})
  fabric.color.multiplyScalar(.77)
  const reinforced=fabric.clone()
  reinforced.color.multiplyScalar(.64)
  const strapsMaterial=new THREE.MeshStandardMaterial({color:'#303532',roughness:.91})
  const hardware=new THREE.MeshStandardMaterial({color:'#383e3d',roughness:.43,metalness:.48})

  pack.add(
    part('backpack-bag',box(.335,.47,.23,.035),fabric,[0,.105,-.105]),
    part('backpack-top-lid',box(.348,.085,.245,.024),reinforced,[0,.338,-.111]),
    part('backpack-pocket',box(.24,.245,.045,.018),fabric,[0,.02,-.238]),
    part('backpack-base',box(.34,.065,.235,.015),reinforced,[0,-.112,-.11]),
  )
  const straps=new THREE.Group()
  straps.name='straps'
  straps.add(combine('backpack-shoulder-webbing',[-1,1].map(side=>webbing([
    [side*.105,.29,-.04],[side*.155,.38,.13],[side*.17,.29,.36],
    [side*.16,.03,.35],[side*.145,-.12,.06],
  ],.039)),strapsMaterial))
  straps.add(combine('backpack-compression-straps',[-1,1].flatMap(side=>[
    webbing([[side*.16,.19,.01],[side*.177,.16,-.11],[side*.135,.17,-.235]],.018),
    webbing([[side*.165,-.055,.01],[side*.177,-.07,-.11],[side*.135,-.055,-.235]],.018),
  ]),strapsMaterial))
  pack.add(straps)
  const zipper=[]
  for(const side of [-1,1]){
    zipper.push(box(.024,.035,.014,.003).translate(side*.13,.16,-.247))
  }
  zipper.push(box(.18,.008,.008,.002).translate(0,.125,-.265))
  zipper.push(box(.012,.028,.009,.002).translate(.07,.112,-.272))
  pack.add(combine('backpack-zips-and-buckles',zipper,hardware))
  const mat=new THREE.Group()
  mat.name='roll-mat'
  mat.position.set(0,-.205,-.1)
  const roll=part('roll-mat-cylinder',new THREE.CylinderGeometry(.059,.059,.37,14),
    new THREE.MeshStandardMaterial({color:palette.mat,roughness:.96}),[0,0,0])
  roll.rotation.z=Math.PI/2
  mat.add(roll)
  mat.add(combine('roll-mat-ties',[-1,1].map(side=>
    new THREE.TorusGeometry(.061,.006,4,16).rotateY(Math.PI/2).translate(side*.115,0,0)),strapsMaterial))
  pack.add(mat)
  return pack
}
