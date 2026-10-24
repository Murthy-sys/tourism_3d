import * as THREE from 'three'
import { getNatureTexture } from './natureAssets'

// A small, local sky provides consistent daylight reflections without a remote HDR download.
export const createDaylightTexture=()=>{
  const width=512,height=256
  const data=new Uint8Array(width*height*4)
  const horizon=new THREE.Color('#c8d3ce')
  const zenith=new THREE.Color('#719bb3')
  const ground=new THREE.Color('#474b3e')
  const color=new THREE.Color()
  for(let y=0;y<height;y++){
    // DataTexture rows start at v=0; equirectangular +Y and the sky pole use v=1.
    const altitude=-Math.cos(y/(height-1)*Math.PI)
    for(let x=0;x<width;x++){
      color.copy(horizon)
      if(altitude>=0) color.lerp(zenith,Math.pow(altitude,.6))
      else color.lerp(ground,Math.min(1,-altitude*2.8))
      const sun=Math.exp(-((x/width-.62)**2/.009+(altitude-.4)**2/.018))
      color.r+=sun*.28
      color.g+=sun*.25
      color.b+=sun*.18
      color.convertLinearToSRGB()
      const i=(y*width+x)*4
      data[i]=Math.min(255,Math.round(color.r*255))
      data[i+1]=Math.min(255,Math.round(color.g*255))
      data[i+2]=Math.min(255,Math.round(color.b*255))
      data[i+3]=255
    }
  }
  const texture=new THREE.DataTexture(data,width,height)
  texture.colorSpace=THREE.SRGBColorSpace
  texture.mapping=THREE.EquirectangularReflectionMapping
  texture.magFilter=THREE.LinearFilter
  texture.minFilter=THREE.LinearFilter
  texture.needsUpdate=true
  return texture
}

export const createDaylight=(renderer,scene)=>{
  const texture=getNatureTexture('sky')||createDaylightTexture()
  const lighting=getNatureTexture('environment')||texture
  const generator=new THREE.PMREMGenerator(renderer)
  let environment
  try{
    environment=generator.fromEquirectangular(lighting)
    scene.environment=environment.texture
  }finally{
    generator.dispose()
  }
  const sky=new THREE.Mesh(
    new THREE.SphereGeometry(350,32,16),
    new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false,fog:false}),
  )
  sky.name='daylight-sky'
  sky.frustumCulled=false
  sky.renderOrder=-10
  scene.add(sky)
  return{
    update(camera){sky.position.copy(camera.position)},
    dispose(){
      scene.environment=null
      environment?.dispose()
      if(!texture.userData.managedByNatureAssets) texture.dispose()
      sky.geometry.dispose()
      sky.material.dispose()
      sky.removeFromParent()
    },
  }
}
