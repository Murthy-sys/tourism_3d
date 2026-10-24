import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export const COACH_AXLES=[-2.43,3.52]
export const COACH_ARCH_RADIUS=.635

// All input geometry is temporary; the returned geometry has one material draw.
export function combineCoachGeometry(parts){
  const normalized=parts.map(part=>part.index?part.toNonIndexed():part)
  const result=mergeGeometries(normalized,false)
  new Set([...parts,...normalized]).forEach(part=>part.dispose())
  return result
}

export function coachSurface(columns,rows,pointAt,reverse=false){
  const positions=[],uvs=[],indices=[]
  for(let row=0;row<=rows;row++){
    for(let column=0;column<=columns;column++){
      positions.push(...pointAt(column/columns,row/rows))
      uvs.push(column/columns,row/rows)
    }
  }
  for(let row=0;row<rows;row++){
    for(let column=0;column<columns;column++){
      const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1
      indices.push(...(reverse?[a,b,c,b,d,c]:[a,c,b,b,c,d]))
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function coachSidePanel(side,start,end,quality,top=1.82,bottom=.42){
  const shape=new THREE.Shape()
  shape.moveTo(start,top)
  shape.lineTo(end,top)
  shape.lineTo(end,bottom)
  // The bottom boundary climbs around the tire, leaving a real open wheel well.
  COACH_AXLES.slice().reverse().forEach(axle=>{
    if(axle-COACH_ARCH_RADIUS<start||axle+COACH_ARCH_RADIUS>end) return
    shape.lineTo(axle+COACH_ARCH_RADIUS,bottom)
    shape.lineTo(axle+COACH_ARCH_RADIUS,.48)
    shape.absarc(axle,.48,COACH_ARCH_RADIUS,0,Math.PI,false)
    shape.lineTo(axle-COACH_ARCH_RADIUS,bottom)
  })
  shape.lineTo(start,bottom)
  shape.closePath()
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth:.035,steps:1,bevelEnabled:true,bevelSize:.008,
    bevelThickness:.008,bevelSegments:1,curveSegments:quality==='mobile'?9:18,
  })
  geometry.rotateY(-Math.PI/2)
  geometry.translate(side>0?1.267:-1.232,0,0)
  return geometry
}

export function coachWindshield(quality){
  return coachSurface(quality==='mobile'?12:24,quality==='mobile'?5:10,(u,v)=>{
    const across=u*2-1
    return [across*(1.19-.07*v),1.63+v*1.57,-5.89+v*.39+.19*Math.pow(Math.abs(across),3)]
  })
}

const rearGlassSetback=y=>.16*Math.pow((y-1.86)/1.32,3)

export function coachSideGlass(side,start,end,quality,bottom=1.86,top=3.18){
  return coachSurface(quality==='mobile'?10:20,4,(u,v)=>{
    const y=bottom+(top-bottom)*v
    const shoulder=(y-1.86)/(3.18-1.86)
    return [side*(1.268-.093*shoulder*shoulder),y,start+(end-start)*u+(start<-5?.39*shoulder*(1-u):0)-(end>5?rearGlassSetback(y)*u:0)]
  },side<0)
}

export function coachRearGlazingCorner(side,quality){
  return coachSurface(4,quality==='mobile'?6:10,(u,v)=>{
    const y=1.86+v*1.32,bodyV=(y-.42)/2.76
    const sideX=1.268-.093*v*v,rearX=1.25-.11*Math.pow(bodyV,4)
    const sideZ=5.5-rearGlassSetback(y),rearZ=5.7-.31*Math.pow(bodyV,5)
    return [side*THREE.MathUtils.lerp(sideX,rearX,u),y,THREE.MathUtils.lerp(sideZ,rearZ,u)]
  },side<0)
}

export function coachRoof(quality){
  return coachSurface(quality==='mobile'?12:24,quality==='mobile'?12:24,(u,v)=>{
    const across=u*2-1,along=v*2-1
    const endRound=Math.pow(Math.abs(along),10)
    return [across*(1.175-.04*endRound),3.18+.37*Math.sqrt(Math.max(0,1-across*across)),along*5.43]
  })
}

export function coachPaintVariation(geometry){
  const positions=geometry.attributes.position,colors=[]
  for(let index=0;index<positions.count;index++){
    const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index)
    const dirt=(1-THREE.MathUtils.smoothstep(y,.4,1.55))*.075
    const variation=Math.sin(z*3.7+x*2.1)*Math.sin(y*5.3-z*.9)*.009
    const shade=1-dirt+variation
    colors.push(shade,shade*.998,shade*.985)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  return geometry
}

export function coachRoughnessMap(){
  const size=64,data=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      const noise=Math.sin(x*127.1+y*311.7)*43758.5453
      const value=222+Math.round((noise-Math.floor(noise)) *24)
      const offset=(y*size+x)*4
      data[offset]=value;data[offset+1]=value;data[offset+2]=value;data[offset+3]=255
    }
  }
  const texture=new THREE.DataTexture(data,size,size)
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.repeat.set(5,2)
  texture.magFilter=THREE.LinearFilter
  texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.generateMipmaps=true
  texture.needsUpdate=true
  texture.userData.ownedByJourney=true
  return texture
}

export function coachWheelGeometry(quality){
  const segments=quality==='mobile'?24:40
  // Rounded truck-tire shoulder and distinct tread channels, not a flat cylinder.
  const profile=[
    [.282,-.155],[.36,-.165],[.425,-.151],[.467,-.123],
    [.48,-.092],[.48,-.055],[.471,-.047],[.48,-.039],
    [.48,.039],[.471,.047],[.48,.055],[.48,.092],
    [.467,.123],[.425,.151],[.36,.165],[.282,.155],[.282,-.155],
  ].map(point=>new THREE.Vector2(...point))
  const tire=new THREE.LatheGeometry(profile,segments)
  const rimProfile=[
    [.275,.117],[.292,.148],[.296,.17],[.278,.182],
    [.254,.174],[.24,.137],[.10,.12],
  ].map(point=>new THREE.Vector2(...point))
  const rim=new THREE.LatheGeometry(rimProfile,segments)
  const dish=new THREE.Shape()
  dish.absarc(0,0,.25,0,Math.PI*2,false)
  for(let i=0;i<8;i++){
    const angle=i/8*Math.PI*2
    const hole=new THREE.Path()
    hole.absarc(Math.cos(angle)*.186,Math.sin(angle)*.186,.034,0,Math.PI*2,true)
    dish.holes.push(hole)
  }
  const face=new THREE.ShapeGeometry(dish,quality==='mobile'?5:8)
  face.rotateX(-Math.PI/2)
  face.translate(0,.145,0)
  const hub=new THREE.CylinderGeometry(.095,.108,.065,segments/2)
  hub.translate(0,.17,0)
  const bolts=[]
  for(let i=0;i<10;i++){
    const angle=i/10*Math.PI*2
    const bolt=new THREE.CylinderGeometry(.014,.017,.022,6)
    bolt.translate(Math.cos(angle)*.126,.162,Math.sin(angle)*.126)
    bolts.push(bolt)
  }
  const drum=new THREE.CylinderGeometry(.265,.265,.17,segments)
  drum.translate(0,.02,0)
  return {tire,rim:combineCoachGeometry([rim,face,hub,...bolts]),drum}
}
