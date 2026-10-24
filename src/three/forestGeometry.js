import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { projectGroundUV } from './environmentSurface'

const random=(index,salt)=>{
  const value=Math.sin(index*127.1+salt*311.7)*43758.5453
  return value-Math.floor(value)
}

// Different growth habits, rather than scaled copies of a single crown.
const TREE_FORMS=[
  {height:8.4,spread:3.1,base:.38,lean:.42,limbs:6,start:.36},
  {height:10.6,spread:2.65,base:.34,lean:.68,limbs:5,start:.49},
  {height:7.1,spread:3.5,base:.43,lean:.82,limbs:6,start:.3},
  {height:9.5,spread:3.15,base:.41,lean:.54,limbs:7,start:.39},
  {height:7.9,spread:2.75,base:.31,lean:.73,limbs:5,start:.34},
  {height:10.1,spread:3.05,base:.45,lean:.38,limbs:6,start:.46},
]

const curvedBranch=(points,baseRadius,tipRadius,seed,{rings=7,sides=7,root=false}={})=>{
  const curve=new THREE.CatmullRomCurve3(points)
  const positions=[],uvs=[],indices=[]
  const normal=new THREE.Vector3(),binormal=new THREE.Vector3(),point=new THREE.Vector3()
  const axis=new THREE.Vector3(0,0,1)
  const length=curve.getLength()
  for(let ring=0;ring<=rings;ring++){
    const t=ring/rings,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize()
    normal.copy(axis).addScaledVector(tangent,-axis.dot(tangent)).normalize()
    binormal.crossVectors(tangent,normal).normalize()
    const taper=THREE.MathUtils.lerp(baseRadius,tipRadius,Math.pow(t,.72))
    for(let side=0;side<=sides;side++){
      const angle=side/sides*Math.PI*2
      const fluting=1+Math.sin(angle*3+seed)*.075+Math.sin(angle*5+seed*2)*.035
      const flare=root?1+Math.pow(1-t,7)*.55*(.6+Math.cos(angle*3+seed)*.4):1
      const radius=taper*fluting*flare
      point.copy(center).addScaledVector(normal,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius)
      positions.push(point.x,point.y,point.z)
      // Bark scale follows the limb length instead of stretching one image
      // from the foot of a ten-metre trunk to its tip.
      uvs.push(side/sides*Math.max(.28,baseRadius*6.28),t*length/1.6)
      if(ring<rings&&side<sides){
        const a=ring*(sides+1)+side,b=a+sides+1
        indices.push(a,a+1,b,a+1,b+1,b)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const normals=geometry.getAttribute('normal')
  for(let ring=0;ring<=rings;ring++){
    const first=ring*(sides+1),last=first+sides
    normal.fromBufferAttribute(normals,first)
      .add(point.fromBufferAttribute(normals,last)).normalize()
    normals.setXYZ(first,normal.x,normal.y,normal.z)
    normals.setXYZ(last,normal.x,normal.y,normal.z)
  }
  return geometry
}

const createTwigFoliage=(shoots,count,seed)=>{
  const positions=[],normals=[],uvs=[],colors=[],indices=[]
  const center=new THREE.Vector3(),normal=new THREE.Vector3(),across=new THREE.Vector3(),along=new THREE.Vector3(),point=new THREE.Vector3()
  for(let leaf=0;leaf<count;leaf++){
    const shoot=shoots[leaf%shoots.length]
    const key=leaf+seed*173
    const t=.18+Math.pow(random(key,1),.7)*.85
    center.lerpVectors(shoot.from,shoot.to,t)
    const azimuth=random(key,2)*Math.PI*2
    const scatter=(.2+random(key,3)*.74)*shoot.volume
    center.x+=Math.cos(azimuth)*scatter
    center.z+=Math.sin(azimuth)*scatter
    center.y+=(random(key,4)-.42)*shoot.volume*.8
    normal.set(Math.cos(azimuth)*.7,.3+random(key,5),Math.sin(azimuth)*.7).normalize()
    across.set(-normal.z,0,normal.x).normalize()
    along.crossVectors(normal,across).normalize()
    const spin=(random(key,6)-.5)*Math.PI
    across.applyAxisAngle(normal,spin)
    along.crossVectors(normal,across).normalize()
    const length=.12+random(key,7)*.12
    const width=length*(.43+random(key,8)*.18)
    const shade=.78+random(leaf%shoots.length+seed,9)*.24+random(key,10)*.08
    const offset=positions.length/3
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){
      point.copy(center).addScaledVector(across,(u-.5)*width*2).addScaledVector(along,(v-.5)*length*2)
      point.addScaledVector(normal,(u-.5)*(v-.5)*length*.25)
      positions.push(point.x,point.y,point.z)
      normals.push(normal.x,normal.y,normal.z)
      uvs.push(u,v)
      colors.push(shade,shade,shade)
    }
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  return geometry
}

export const createForestTreeGeometry=(variant,quality,{distant=false}={})=>{
  const wood=[]
  const shoots=[]
  const form=TREE_FORMS[variant%TREE_FORMS.length]
  const mobile=quality==='mobile'
  const {height,lean}=form
  const leanAngle=variant*1.78+.3
  const trunkPoints=Array.from({length:6},(_,index)=>{
    const t=index/5
    return new THREE.Vector3(
      Math.cos(leanAngle)*lean*t*t+Math.sin(t*5+variant)*t*.11,
      t*height-.07,
      Math.sin(leanAngle)*lean*t*t+Math.sin(t*3.5+variant)*t*.14,
    )
  })
  const trunkCurve=new THREE.CatmullRomCurve3(trunkPoints)
  wood.push(curvedBranch(trunkPoints,form.base,.035,variant,{rings:distant?7:mobile?9:12,sides:distant?6:mobile?8:10,root:true}))
  for(let root=0;root<(distant?3:5);root++){
    const angle=root*2.399+variant*.7
    const reach=.6+random(root,variant+31)*.5
    wood.push(curvedBranch([
      new THREE.Vector3(0,.33,0),
      new THREE.Vector3(Math.cos(angle)*reach*.5,.06,Math.sin(angle)*reach*.5),
      new THREE.Vector3(Math.cos(angle)*reach,-.09,Math.sin(angle)*reach),
    ],form.base*.44,.018,root+variant,{rings:distant?2:3,sides:distant?4:5}))
  }
  for(let limb=0;limb<form.limbs;limb++){
    const fraction=limb/(form.limbs-1)
    const level=form.start+fraction*(.87-form.start)+random(limb,variant+2)*.035
    const start=trunkCurve.getPoint(level)
    const angle=limb*2.39996+variant*.77+(random(limb,variant+4)-.5)*.8
    const reach=form.spread*(.62+random(limb,variant+3)*.4)*(1-fraction*.26)
    const end=start.clone().add(new THREE.Vector3(Math.cos(angle)*reach,.7+random(limb,variant+5)*1.15,Math.sin(angle)*reach))
    const middle=start.clone().lerp(end,.5)
    middle.y-=.22+random(limb,variant+6)*.28
    middle.x+=Math.sin(angle)*.2
    const branchCurve=new THREE.CatmullRomCurve3([start,middle,end])
    wood.push(curvedBranch([start,middle,end],form.base*(.39-fraction*.17),.014,limb+variant,{rings:distant?3:mobile?5:7,sides:distant?5:mobile?6:7}))
    for(let fork=0;fork<3;fork++){
      const from=branchCurve.getPoint(.42+fork*.2)
      const forkAngle=angle+(fork-1)*(.65+random(limb,variant+fork+10)*.35)
      const to=end.clone().lerp(from,.14).add(new THREE.Vector3(
        Math.cos(forkAngle)*(.48+random(limb,variant+fork+15)*.65),
        .3+random(limb,variant+fork+19)*.5,
        Math.sin(forkAngle)*(.48+random(limb,variant+fork+15)*.65),
      ))
      const bend=from.clone().lerp(to,.55)
      bend.y-=.13
      wood.push(curvedBranch([from,bend,to],.045-fraction*.015,.005,limb*3+fork+variant,{rings:distant?2:mobile?3:4,sides:distant?4:5}))
      shoots.push({from:from.clone().lerp(to,.38),to,volume:.66+random(limb,variant+fork+28)*.42})
    }
  }
  // The leader carries a small, offset crown rather than a bare pole above it.
  const leader=trunkPoints.at(-1)
  for(let index=0;index<3;index++) shoots.push({from:leader.clone().add(new THREE.Vector3(0,-.8,0)),to:leader.clone().add(new THREE.Vector3(Math.cos(index*2.1+variant)*.65,.18,Math.sin(index*2.1+variant)*.65)),volume:.75})
  const leaves=distant?(mobile?250:400):(mobile?680:1220)
  const skeleton=mergeGeometries(wood)
  const crown=createTwigFoliage(shoots,leaves,variant+1)
  wood.forEach(geometry=>geometry.dispose())
  skeleton.computeBoundingBox()
  skeleton.computeBoundingSphere()
  crown.computeBoundingBox()
  crown.computeBoundingSphere()
  skeleton.userData={branchCount:form.limbs*4,growthForm:variant,trunkHeight:height,curvedLimbs:true,rootFlare:true}
  crown.userData={organicSilhouette:true,clusters:shoots.length,leaves,distant,distribution:'branch-tip-sprays'}
  return{skeleton,crown}
}

export const createForestGroundGeometry=(heightAt,quality)=>{
  const geometry=new THREE.PlaneGeometry(160,88,quality==='mobile'?80:112,quality==='mobile'?88:112)
  geometry.rotateX(-Math.PI/2)
  geometry.translate(0,0,-130)
  const positions=geometry.getAttribute('position')
  const colors=[]
  const earth=new THREE.Color('#676147')
  const moss=new THREE.Color('#596443')
  const color=new THREE.Color()
  for(let index=0;index<positions.count;index+=1){
    const x=positions.getX(index),z=positions.getZ(index)
    positions.setY(index,heightAt(x,z))
    const variation=.5+Math.sin(x*.23+Math.sin(z*.17))*Math.cos(z*.27-x*.11)*.35
    color.copy(earth).lerp(moss,variation)
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return projectGroundUV(geometry,2)
}
