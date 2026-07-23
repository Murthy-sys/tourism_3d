import * as THREE from 'three'
import { mesh } from './primitives'
import {
  LANDMARKS,
  createTerrainGeometry,
  sampleMountainHeight,
  sampleMountainSlope,
} from './terrain'

const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const material=(color,roughness=.9,extra={})=>new THREE.MeshStandardMaterial({
  color,
  roughness,
  ...extra,
})

const deterministic=(index,salt=0)=>{
  const value=Math.sin((index+1)*91.733+salt*37.119)*43758.5453
  return value-Math.floor(value)
}

const routeDistance=(x,z,points)=>points.reduce((distance,point)=>{
  return Math.min(distance,Math.hypot(x-point.x,z-point.z))
},Infinity)

const createRoute=heightAt=>{
  const [startX,,startZ]=LANDMARKS.mountainStart
  const [endX,endY,endZ]=LANDMARKS.mountainLanding
  const points=Array.from({length:32},(_,index)=>{
    const t=index/31
    const meander=Math.sin(t*Math.PI)*(
      Math.sin(t*Math.PI*3.4)*1.45+
      Math.sin(t*Math.PI*7.1)*.34
    )
    const x=THREE.MathUtils.lerp(startX,endX,t)+meander
    const z=THREE.MathUtils.lerp(startZ,endZ,t)
    const y=index===31?endY:heightAt(x,z)+.08
    return new THREE.Vector3(x,y,z)
  })
  return new THREE.CatmullRomCurve3(points,false,'centripetal')
}

const createTerrain=(heightAt,quality)=>{
  const segmentsX=quality==='mobile'?64:112
  const segmentsZ=quality==='mobile'?76:120
  const geometry=createTerrainGeometry({
    width:72,
    depth:78,
    segmentsX,
    segmentsZ,
    heightAt,
  })
  const position=geometry.attributes.position
  const colors=new Float32Array(position.count*3)
  const grass=new THREE.Color('#49683c')
  const soil=new THREE.Color('#6b5841')
  const rock=new THREE.Color('#59615e')
  const color=new THREE.Color()
  let minimumColorSum=Infinity
  let maximumColorSum=-Infinity
  for(let index=0;index<position.count;index+=1){
    const x=position.getX(index)
    const z=position.getZ(index)
    const height=position.getY(index)
    const slope=sampleMountainSlope(x,z)
    const soilWeight=THREE.MathUtils.smoothstep(slope,.12,.5)
    const rockWeight=THREE.MathUtils.clamp(
      THREE.MathUtils.smoothstep(slope,.38,.86)+
      THREE.MathUtils.smoothstep(height,6.5,10)*.42,
      0,
      1,
    )
    color.copy(grass).lerp(soil,soilWeight).lerp(rock,rockWeight)
    const detail=
      Math.sin(x*1.71+Math.sin(z*.63))*0.52+
      Math.cos(z*1.19-x*.47)*.31+
      Math.sin((x+z)*3.27)*.17
    color.offsetHSL(detail*.012,detail*.024,detail*.042)
    const colorSum=color.r+color.g+color.b
    minimumColorSum=Math.min(minimumColorSum,colorSum)
    maximumColorSum=Math.max(maximumColorSum,colorSum)
    colors[index*3]=color.r
    colors[index*3+1]=color.g
    colors[index*3+2]=color.b
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
  geometry.userData.colorVariation=maximumColorSum-minimumColorSum
  const terrainMaterial=new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:.9,
    metalness:0,
    dithering:true,
  })
  terrainMaterial.userData.surfaceDetail='multiscale-color-noise'
  const terrain=mesh(geometry,terrainMaterial)
  terrain.name='hill-terrain'
  return terrain
}

const createRidgeGeometry=layer=>{
  const columns=40
  const rows=5
  const positions=[]
  const indices=[]
  for(let index=0;index<=columns;index+=1){
    const t=index/columns
    const x=THREE.MathUtils.lerp(-47,47,t)
    const z=-43-layer*11+
      Math.sin(index*.61+layer*1.7)*1.3+
      Math.sin(index*.19-layer)*1.8
    const base=-.7+layer*.45
    const ridgeHeight=7.2-layer*.55+
      Math.sin(index*.72+layer)*1.25+
      Math.sin(index*.23+layer*2.2)*1.8+
      deterministic(index,layer)*.65
    const opening=THREE.MathUtils.smoothstep(Math.abs(x),5+layer*1.5,20+layer*2)
    const height=THREE.MathUtils.lerp(base+.12,ridgeHeight,opening)
    for(let row=0;row<=rows;row+=1){
      const verticalProgress=row/rows
      const relief=Math.sin(verticalProgress*Math.PI)*(
        .32+
        .14*Math.sin(index*.47+layer*1.9)
      )
      positions.push(
        x,
        THREE.MathUtils.lerp(base,height,verticalProgress),
        z-relief,
      )
    }
    if(index<columns){
      const stride=rows+1
      for(let row=0;row<rows;row+=1){
        const current=index*stride+row
        indices.push(
          current,current+1,current+stride,
          current+1,current+stride+1,current+stride,
        )
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const createRidges=()=>{
  const ridges=namedGroup('hill-ridges')
  const colors=['#53645b','#71807a','#919b98']
  colors.forEach((color,index)=>{
    const ridge=mesh(
      createRidgeGeometry(index),
      material(color,.97,{side:THREE.DoubleSide}),
    )
    ridge.name=`hill-ridge-${index+1}`
    ridge.renderOrder=-3+index
    ridges.add(ridge)
  })
  return ridges
}

const createTree=(materials,index,scale)=>{
  const tree=new THREE.Group()
  tree.name='hill-tree'
  const trunk=mesh(
    new THREE.CylinderGeometry(.1*scale,.16*scale,1.65*scale,7),
    materials.wood,
    [0,.825*scale,0],
  )
  tree.add(trunk)
  if(index%3===0){
    for(let level=0;level<3;level+=1){
      const crown=mesh(
        new THREE.ConeGeometry((.67-level*.11)*scale,1.2*scale,8),
        level===1?materials.leaf2:materials.leaf,
        [0,(1.38+level*.42)*scale,0],
      )
      tree.add(crown)
    }
  }else{
    const crown=mesh(
      new THREE.IcosahedronGeometry(.72*scale,index%2?1:2),
      index%2?materials.leaf:materials.leaf2,
      [0,1.83*scale,0],
    )
    crown.scale.set(1,.88,.82)
    tree.add(crown)
    if(index%4===1){
      tree.add(mesh(
        new THREE.IcosahedronGeometry(.45*scale,1),
        materials.leaf,
        [.38*scale,1.63*scale,0],
      ))
    }
  }
  tree.rotation.y=deterministic(index,11)*Math.PI*2
  return tree
}

const createBush=(materials,index,scale)=>{
  const bush=new THREE.Group()
  bush.name='hill-bush'
  ;[-1,0,1].forEach((offset,part)=>{
    const leaf=mesh(
      new THREE.IcosahedronGeometry((.31+part*.035)*scale,1),
      part===1?materials.leaf2:materials.leaf,
      [offset*.25*scale,.28*scale,Math.sin(index+part)*.12*scale],
    )
    leaf.scale.y=.78
    bush.add(leaf)
  })
  return bush
}

const createGrassCluster=(materials,index,scale)=>{
  const cluster=new THREE.Group()
  cluster.name='hill-grass-cluster'
  for(let blade=0;blade<5;blade+=1){
    const angle=(blade/5)*Math.PI*2+deterministic(index,blade)
    const grass=mesh(
      new THREE.ConeGeometry(.035*scale,.48*scale,5),
      blade%2?materials.leaf2:materials.leaf,
      [Math.cos(angle)*.13*scale,.24*scale,Math.sin(angle)*.13*scale],
      [Math.sin(angle)*.16,0,Math.cos(angle)*.16],
    )
    cluster.add(grass)
  }
  return cluster
}

const landscapePosition=(index,salt,heightAt,routePoints)=>{
  for(let attempt=0;attempt<8;attempt+=1){
    const key=index+attempt*101
    const x=THREE.MathUtils.lerp(-33,33,deterministic(key,salt))
    const z=THREE.MathUtils.lerp(-35,18,deterministic(key,salt+1))
    if(routeDistance(x,z,routePoints)>1.3){
      return new THREE.Vector3(x,heightAt(x,z),z)
    }
  }
  const side=index%2?-1:1
  const z=THREE.MathUtils.lerp(-35,18,deterministic(index,salt+3))
  const x=side*(5+deterministic(index,salt+4)*24)
  return new THREE.Vector3(x,heightAt(x,z),z)
}

const createRockFaces=(materials,heightAt,routePoints,quality)=>{
  const rocks=namedGroup('hill-rock-faces')
  const count=quality==='mobile'?14:28
  for(let index=0;index<count;index+=1){
    const position=landscapePosition(index,21,heightAt,routePoints)
    const size=.25+deterministic(index,24)*.55
    const rock=mesh(
      new THREE.DodecahedronGeometry(size,1),
      index%3===0?materials.stone:material(index%2?'#59615e':'#67645b',.98),
      position.toArray(),
      [deterministic(index,26)*.7,deterministic(index,27)*Math.PI,deterministic(index,28)*.45],
    )
    rock.name='rock-outcrop'
    rock.scale.set(
      .9+.45*deterministic(index,29),
      .45+.3*deterministic(index,30),
      .75+.45*deterministic(index,31),
    )
    rocks.add(rock)
  }
  return rocks
}

const createVegetation=(materials,heightAt,routePoints,quality)=>{
  const vegetation=namedGroup('hill-vegetation')
  const count=quality==='mobile'?34:76
  for(let index=0;index<count;index+=1){
    const position=landscapePosition(index,43,heightAt,routePoints)
    const scale=.65+deterministic(index,47)*.72
    const kind=index%6
    const object=kind<2
      ?createTree(materials,index,scale)
      :kind<4
        ?createBush(materials,index,scale)
        :createGrassCluster(materials,index,scale)
    object.position.copy(position)
    vegetation.add(object)
  }
  return vegetation
}

const createRibbonGeometry=(points,width)=>{
  const positions=[]
  const indices=[]
  points.forEach((point,index)=>{
    const previous=points[Math.max(0,index-1)]
    const next=points[Math.min(points.length-1,index+1)]
    const tangent=new THREE.Vector2(next.x-previous.x,next.z-previous.z).normalize()
    const side=new THREE.Vector2(-tangent.y,tangent.x).multiplyScalar(width*.5)
    positions.push(
      point.x+side.x,point.y+.012,point.z+side.y,
      point.x-side.x,point.y+.012,point.z-side.y,
    )
    if(index<points.length-1){
      const current=index*2
      indices.push(current,current+2,current+1,current+1,current+2,current+3)
    }
  })
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const createTrail=(materials,route,heightAt,quality)=>{
  const trail=namedGroup('hill-trail')
  const surface=mesh(
    createRibbonGeometry(route.points,1.05),
    material('#6b5841',1),
  )
  surface.name='hill-trail-earth'
  trail.add(surface)

  const wetStones=namedGroup('hill-wet-stones')
  const stoneCount=quality==='mobile'?7:13
  for(let index=0;index<stoneCount;index+=1){
    const t=.72+index/(stoneCount-1)*.24
    const point=route.getPoint(t)
    const tangent=route.getTangent(t)
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize()
    const offset=(index%2?-.38:.38)*(1+deterministic(index,61)*.35)
    const x=point.x+side.x*offset
    const z=point.z+side.z*offset
    const stone=mesh(
      new THREE.DodecahedronGeometry(.18+deterministic(index,62)*.15,0),
      materials.stone,
      [x,heightAt(x,z)+.09,z],
      [0,deterministic(index,63)*Math.PI,0],
    )
    stone.scale.y=.38
    wetStones.add(stone)
  }
  trail.add(wetStones)

  const reeds=namedGroup('hill-landing-reeds')
  for(let index=0;index<(quality==='mobile'?10:22);index+=1){
    const side=index%2?-1:1
    const x=LANDMARKS.mountainLanding[0]+side*(1.1+deterministic(index,70)*2.1)
    const z=LANDMARKS.mountainLanding[2]-1.2+deterministic(index,71)*3.8
    const height=.45+deterministic(index,72)*.65
    reeds.add(mesh(
      new THREE.CylinderGeometry(.014,.025,height,5),
      index%3?materials.leaf2:materials.leaf,
      [x,heightAt(x,z)+height*.5,z],
      [Math.sin(index)*.07,0,Math.cos(index)*.07],
    ))
  }
  trail.add(reeds)
  return trail
}

const createLanding=materials=>{
  const landing=namedGroup('mountain-water-landing')
  landing.position.set(...LANDMARKS.mountainLanding)
  const deck=namedGroup('mountain-landing-deck')
  deck.position.y=.18
  for(let index=-2;index<=2;index+=1){
    const plank=mesh(
      new THREE.BoxGeometry(.7,.16,3.2),
      index%2?materials.wood:material('#5a3d2c',.96),
      [index*.72,0,0],
    )
    plank.rotation.y=(deterministic(index,81)-.5)*.025
    plank.name='landing-plank'
    deck.add(plank)
  }
  ;[-1.65,1.65].forEach(side=>{
    ;[-1.35,1.35].forEach(depth=>{
      deck.add(mesh(
        new THREE.CylinderGeometry(.055,.075,1.25,8),
        materials.wood,
        [side,-.35,depth],
      ))
    })
  })
  landing.add(deck)
  return landing
}

const createMist=(quality)=>{
  const mist=namedGroup('hill-mist')
  const count=quality==='mobile'?4:7
  for(let index=0;index<count;index+=1){
    const opacity=.018+index%3*.003
    const mistMaterial=new THREE.MeshBasicMaterial({
      color:index%2?'#d5ddd5':'#c6d4ca',
      transparent:true,
      opacity,
      depthWrite:false,
      side:THREE.DoubleSide,
    })
    const plane=mesh(
      new THREE.PlaneGeometry(10+index%3,2.1+index%2*.5),
      mistMaterial,
      [(index%3-1)*9,1.6+index%2*.8,-8-index*5.3],
      [0,(index%2-.5)*.12,0],
    )
    plane.name='hill-mist-pocket'
    plane.userData.baseX=plane.position.x
    plane.userData.baseOpacity=opacity
    mist.add(plane)
  }
  return mist
}

const createWaterGlint=()=>{
  const water=mesh(
    new THREE.PlaneGeometry(42,25,10,7),
    new THREE.MeshBasicMaterial({
      color:'#91bac0',
      transparent:true,
      opacity:.27,
      depthWrite:false,
      side:THREE.DoubleSide,
    }),
    [2,.025,-52],
    [-Math.PI/2,0,0],
  )
  water.name='distant-water-glint'
  water.receiveShadow=false
  return water
}

export function createHillWorld(materials,quality='desktop'){
  const world=namedGroup('hill-world')
  const heightAt=sampleMountainHeight
  const route=createRoute(heightAt)
  const terrain=createTerrain(heightAt,quality)
  const ridges=createRidges()
  const rocks=createRockFaces(materials,heightAt,route.points,quality)
  const vegetation=createVegetation(materials,heightAt,route.points,quality)
  const mist=createMist(quality)
  const trail=createTrail(materials,route,heightAt,quality)
  const landing=createLanding(materials)
  const water=createWaterGlint()
  world.add(terrain,ridges,rocks,vegetation,mist,trail,landing,water)

  const warmLight=new THREE.DirectionalLight('#ffe1aa',3.1)
  warmLight.position.set(-16,24,13)
  world.add(warmLight)

  world.userData={
    route,
    heightAt,
    landing,
    distantWaterAnchor:new THREE.Vector3(2,.4,-51),
    mist,
    water,
  }
  return world
}

export function updateHillWorld(world,elapsed){
  const {mist,water}=world.userData
  if(mist){
    mist.children.forEach((pocket,index)=>{
      pocket.position.x=pocket.userData.baseX+Math.sin(elapsed*.12+index*1.47)*.48
      const opacity=pocket.userData.baseOpacity*(.88+Math.sin(elapsed*.2+index)*.12)
      pocket.material.opacity=opacity
    })
  }
  if(water?.material){
    water.material.opacity=.255+Math.sin(elapsed*.55)*.025
    water.rotation.z=Math.sin(elapsed*.09)*.012
  }
}
