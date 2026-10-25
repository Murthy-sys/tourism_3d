import * as THREE from 'three'
import { smootherstep } from './terrain'

export const ARRIVAL_DURATION=6.4

export const createArrivalController=(enabled=false)=>{
  let phase=enabled?'waiting':'complete'
  let elapsed=phase==='complete'?ARRIVAL_DURATION:0
  return{
    setPhase(next){
      if(next==='complete'){
        phase='complete'
        elapsed=ARRIVAL_DURATION
      }else if(next==='playing'&&phase==='waiting'){
        phase='playing'
      }
    },
    advance(delta,reducedMotion=false){
      if(phase!=='playing') return false
      if(reducedMotion) elapsed=ARRIVAL_DURATION
      else if(Number.isFinite(delta)&&delta>0&&delta<.25) elapsed+=delta
      if(elapsed<ARRIVAL_DURATION) return false
      elapsed=ARRIVAL_DURATION
      phase='complete'
      return true
    },
    phase:()=>phase,
    progress:()=>Math.min(1,elapsed/ARRIVAL_DURATION),
  }
}

export const getArrivalCameraFrame=(destination,progress)=>{
  const t=smootherstep(0,1,progress)
  const inverse=1-t
  const [x,y,z]=destination.camera
  // Descend from the cloud horizon into the city departure composition.
  const start=[x+2,y+58,z+20]
  const controlA=[x+2,y+47,z+16]
  const controlB=[x+.5,y+9,z+3]
  const groundReveal=smootherstep(.03,.66,progress)
  return{
    camera:destination.camera.map((value,index)=>
      inverse**3*start[index]+3*inverse**2*t*controlA[index]+
      3*inverse*t*t*controlB[index]+t**3*value
    ),
    target:[
      destination.target[0],
      THREE.MathUtils.lerp(start[1]+10,destination.target[1],groundReveal),
      destination.target[2],
    ],
  }
}

const hash=(x,y)=>{
  const value=Math.sin(x*127.1+y*311.7)*43758.5453
  return value-Math.floor(value)
}
const noise=(x,y)=>{
  const ix=Math.floor(x),iy=Math.floor(y)
  const fx=x-ix,fy=y-iy
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),
    THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v,
  )
}

const createCloudTexture=()=>{
  const size=128
  const pixels=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1)
    const billows=noise(u*7,v*5)*.6+noise(u*17,v*13)*.28+noise(u*39,v*29)*.12
    const edge=Math.pow(Math.sin(u*Math.PI)*Math.sin(v*Math.PI),.8)
    const density=smootherstep(.2,.7,billows)*edge
    const shade=Math.round(215+billows*38)
    const index=(y*size+x)*4
    pixels.set([shade,Math.min(255,shade+3),Math.min(255,shade+6),Math.round(density*245)],index)
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat)
  texture.colorSpace=THREE.SRGBColorSpace
  texture.minFilter=THREE.LinearFilter
  texture.magFilter=THREE.LinearFilter
  texture.userData.ownedByJourney=true
  texture.needsUpdate=true
  return texture
}

export const createArrivalClouds=destination=>{
  const group=new THREE.Group()
  group.name='arrival-cloud-bank'
  const texture=createCloudTexture()
  const sprites=[]
  for(let index=0;index<14;index++){
    const material=new THREE.SpriteMaterial({
      map:texture,color:index%3===0?'#f0f2ef':'#ffffff',
      transparent:true,opacity:.68,depthWrite:false,fog:false,
    })
    const cloud=new THREE.Sprite(material)
    cloud.scale.set(32+index%3*10,15+index%4*3,1)
    group.add(cloud)
    sprites.push(cloud)
  }
  const clouds={
    group,
    update(progress,frame=destination){
      const opacity=1-smootherstep(.08,.64,progress)
      group.visible=opacity>.001
      const start=getArrivalCameraFrame(frame,0).camera
      const dx=frame.target[0]-start[0],dz=frame.target[2]-start[2]
      const length=Math.hypot(dx,dz)||1
      const forwardX=dx/length,forwardZ=dz/length
      sprites.forEach((cloud,index)=>{
        cloud.material.opacity=opacity*.68
        const layer=Math.floor(index/4)
        const depth=16+layer*15+(index%2)*4
        const side=(index%4-1.5)*(17+layer*5)+Math.sin(progress*2.5+index)*progress*2
        cloud.position.set(
          start[0]+forwardX*depth-forwardZ*side,
          start[1]-layer*7+(index%3-1)*4,
          start[2]+forwardZ*depth+forwardX*side,
        )
      })
    },
  }
  clouds.update(0)
  return clouds
}
