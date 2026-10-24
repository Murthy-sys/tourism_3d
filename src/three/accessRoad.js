import * as THREE from 'three'
import {createEnvironmentMaterial,projectGroundUV} from './environmentSurface'

export const ACCESS_ROAD_WIDTH=5.6
export const ACCESS_ROAD_SHOULDER=.85
export const ACCESS_ROAD_CLEARANCE=.065
export const ACCESS_ROAD_POINTS=Object.freeze([
  [-72,76],[-51,62],[-34,48],[-26,38],[-18,34],[-8,34],
].map(point=>Object.freeze(point)))
const curve=new THREE.CatmullRomCurve3(ACCESS_ROAD_POINTS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal')
const points=curve.getSpacedPoints(96)
const length=curve.getLength()
const smooth=value=>{const t=THREE.MathUtils.clamp(value,0,1);return t*t*(3-2*t)}

export const sampleAccessRoad=(x,z)=>{
  if(x<-80||x>0||z<25||z>84) return {distance:Infinity,progress:0,height:0}
  let minimum=Infinity,progress=0
  for(let index=0;index<points.length-1;index++){
    const a=points[index],b=points[index+1],dx=b.x-a.x,dz=b.z-a.z
    const t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1)
    const distance=(x-a.x-dx*t)**2+(z-a.z-dz*t)**2
    if(distance<minimum){minimum=distance;progress=(index+t)/(points.length-1)}
  }
  return {distance:Math.sqrt(minimum),progress,height:.35+4.8*(1-smooth(progress/.8))}
}

const cross=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x)
const clipPolygon=(polygon,edgeA,edgeB)=>{
  const result=[]
  for(let index=0;index<polygon.length;index++){
    const a=polygon[index],b=polygon[(index+1)%polygon.length]
    const da=cross(edgeA,edgeB,a),db=cross(edgeA,edgeB,b)
    if(da>=-1e-8) result.push(a)
    if((da>=0)!==(db>=0)) result.push(a.clone().lerp(b,da/(da-db)))
  }
  return result
}
const ribbonQuad=(a,b,minOffset,maxOffset)=>{
  const pa=curve.getPointAt(a),pb=curve.getPointAt(b)
  const ta=curve.getTangentAt(a),tb=curve.getTangentAt(b)
  const leftA=new THREE.Vector3(-ta.z,0,ta.x),leftB=new THREE.Vector3(-tb.z,0,tb.x)
  return [pa.clone().addScaledVector(leftA,minOffset),pb.clone().addScaledVector(leftB,minOffset),pb.clone().addScaledVector(leftB,maxOffset),pa.clone().addScaledVector(leftA,maxOffset)]
}

// Clip each road strip to the rendered ground triangles. Barycentric Y values
// survive clipping, including across the lower-resolution terrain surround.
const groundTriangles=terrainGeometries=>{
  const triangles=[]
  for(const geometry of terrainGeometries){
    const position=geometry?.getAttribute('position'),index=geometry?.getIndex()
    if(!position||!index) continue
    for(let offset=0;offset<index.count;offset+=3){
      const a=index.getX(offset),b=index.getX(offset+1),c=index.getX(offset+2)
      const minX=Math.min(position.getX(a),position.getX(b),position.getX(c)),maxX=Math.max(position.getX(a),position.getX(b),position.getX(c))
      const minZ=Math.min(position.getZ(a),position.getZ(b),position.getZ(c)),maxZ=Math.max(position.getZ(a),position.getZ(b),position.getZ(c))
      if(maxX<-80||minX>0||maxZ<25||minZ>84) continue
      const vertices=[a,b,c].map(vertex=>new THREE.Vector3().fromBufferAttribute(position,vertex))
      triangles.push({vertices,minX,maxX,minZ,maxZ})
    }
  }
  return triangles
}

const drapeRibbon=(triangles,bands,clearance,heightAt)=>{
  const positions=[],indices=[],colors=[]
  const color=new THREE.Color(),dry=new THREE.Color('#8e897b')
  const append=polygon=>{
    if(polygon.length<3) return
    const faces=[]
    for(let i=1;i<polygon.length-1;i++){
      const area=cross(polygon[0],polygon[i],polygon[i+1])
      if(Math.abs(area)<1e-6) continue
      // Positive XZ polygon winding points downward in Three's Y-up world.
      faces.push(...(area>0?[0,i+1,i]:[0,i,i+1]))
    }
    if(!faces.length) return
    const mapped=new Map()
    for(const vertex of new Set(faces)){
      const point=polygon[vertex]
      mapped.set(vertex,positions.length/3)
      positions.push(point.x,point.y+clearance,point.z)
      const sample=sampleAccessRoad(point.x,point.z)
      const speckle=.94+.06*Math.sin(point.x*3.9+point.z*7.1)
      color.setRGB(speckle,speckle,speckle).lerp(dry,smooth((sample.progress-.85)/.15)*.38)
      colors.push(color.r,color.g,color.b)
    }
    faces.forEach(vertex=>indices.push(mapped.get(vertex)))
  }
  for(const {from=0,to=1,min,max,segments=96} of bands){
    for(let step=0;step<segments;step++){
      const a=THREE.MathUtils.lerp(from,to,step/segments),b=THREE.MathUtils.lerp(from,to,(step+1)/segments)
      const quad=ribbonQuad(a,b,min,max)
      const minX=Math.min(...quad.map(v=>v.x)),maxX=Math.max(...quad.map(v=>v.x)),minZ=Math.min(...quad.map(v=>v.z)),maxZ=Math.max(...quad.map(v=>v.z))
      if(!triangles.length){
        quad.forEach(point=>{point.y=heightAt(point.x,point.z)})
        append(quad)
        continue
      }
      for(const triangle of triangles){
        if(triangle.maxX<minX||triangle.minX>maxX||triangle.maxZ<minZ||triangle.minZ>maxZ) continue
        let polygon=triangle.vertices
        for(let edge=0;edge<4&&polygon.length;edge++) polygon=clipPolygon(polygon,quad[edge],quad[(edge+1)%4])
        append(polygon)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  projectGroundUV(geometry,1.8)
  return geometry
}

export const createAccessRoad=({heightAt,terrainGeometry,terrainSurroundGeometry,quality='desktop'})=>{
  const group=new THREE.Group()
  group.name='trailhead-access-road'
  const terrain=groundTriangles([terrainGeometry,terrainSurroundGeometry].filter(Boolean))
  const half=ACCESS_ROAD_WIDTH/2,outer=half+ACCESS_ROAD_SHOULDER
  const segments=quality==='mobile'?64:96
  const asphalt=createEnvironmentMaterial('#53584f','rock',{roughness:.94,bumpScale:.012,vertexColors:true})
  asphalt.color.set('#68736e')
  asphalt.normalScale?.set(.12,.12)
  const shoulder=createEnvironmentMaterial('#8c8270','rock',{roughness:1,bumpScale:.018,vertexColors:true})
  shoulder.color.set('#999184')
  const markings=new THREE.MeshStandardMaterial({color:'#b1ac98',roughness:1,vertexColors:true})
  const bands=[
    ['trailhead-road-surface',[{min:-half,max:half,segments}],asphalt,ACCESS_ROAD_CLEARANCE],
    ['trailhead-road-shoulders',[{min:-outer,max:-half,segments},{min:half,max:outer,segments}],shoulder,ACCESS_ROAD_CLEARANCE],
    ['trailhead-road-center-marks',Array.from({length:Math.floor(length*.77/7)},(_,index)=>({from:(index*7+1)/length,to:(index*7+4)/length,min:-.06,max:.06,segments:4})),markings,ACCESS_ROAD_CLEARANCE+.004],
  ]
  for(const [name,strips,material,clearance] of bands){
    const object=new THREE.Mesh(drapeRibbon(terrain,strips,clearance,heightAt),material)
    projectGroundUV(object.geometry,name==='trailhead-road-surface'?.22:.9)
    object.name=name;object.castShadow=false;object.receiveShadow=true
    group.add(object)
  }
  group.userData={width:ACCESS_ROAD_WIDTH,shoulder:ACCESS_ROAD_SHOULDER,clearance:ACCESS_ROAD_CLEARANCE,curve,length,points:ACCESS_ROAD_POINTS}
  return group
}
