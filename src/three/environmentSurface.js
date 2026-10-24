import * as THREE from 'three'
import { getNatureSurface,getNatureTexture } from './natureAssets'

const fract=value=>value-Math.floor(value)
const hash=(x,y=0)=>fract(Math.sin(x*127.1+y*311.7+19.19)*43758.5453)
const smooth=value=>value*value*(3-2*value)
const noise=(x,y,period)=>{
  const ix=Math.floor(x),iy=Math.floor(y)
  const fx=smooth(fract(x)),fy=smooth(fract(y))
  const sample=(a,b)=>hash((a+period)%period,(b+period)%period)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(sample(ix,iy),sample(ix+1,iy),fx),
    THREE.MathUtils.lerp(sample(ix,iy+1),sample(ix+1,iy+1),fx),
    fy,
  )
}

const textureFrom=(pixels,size,colorSpace=THREE.NoColorSpace)=>{
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat)
  texture.colorSpace=colorSpace
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.magFilter=THREE.LinearFilter
  texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.generateMipmaps=true
  texture.anisotropy=4
  texture.userData.ownedByEnvironment=true
  texture.needsUpdate=true
  return texture
}

const surfacePixels=new Map()
const getSurfacePixels=kind=>{
  if(surfacePixels.has(kind)) return surfacePixels.get(kind)
  const size=128
  const albedo=new Uint8Array(size*size*4)
  const relief=new Uint8Array(size*size*4)
  for(let y=0;y<size;y+=1){
    for(let x=0;x<size;x+=1){
      const u=x/size,v=y/size
      const coarse=noise(u*8,v*8,8)
      const medium=noise(u*24,v*24,24)
      const fine=noise(u*64,v*64,64)
      const grain=hash(x,y)
      const strata=kind==='bark'
        ?Math.pow(.5+.5*Math.sin(u*Math.PI*32+noise(u*8,v*8,8)*4),4)
        :kind==='rock'
          ?Math.abs(Math.sin((v*13+coarse*1.6)*Math.PI))*.32
          :0
      const height=THREE.MathUtils.clamp(coarse*.42+medium*.31+fine*.17+grain*.1-strata*.3,0,1)
      const shade=THREE.MathUtils.clamp(.64+height*.43-strata*.11,0,1)
      const offset=(y*size+x)*4
      albedo[offset]=Math.round(255*shade)
      albedo[offset+1]=Math.round(255*(shade-(kind==='soil'?.022:0)))
      albedo[offset+2]=Math.round(255*(shade-(kind==='soil'?.045:.008)))
      albedo[offset+3]=255
      relief[offset]=Math.round(255*height)
      relief[offset+1]=Math.round(210+height*45)
      relief[offset+2]=relief[offset]
      relief[offset+3]=255
    }
  }
  const result={albedo,relief,size}
  surfacePixels.set(kind,result)
  return result
}

export const createEnvironmentMaterial=(color,kind='soil',options={})=>{
  const surface=getNatureSurface(kind)
  if(surface){
    const material=new THREE.MeshStandardMaterial({
      ...surface,
      color:new THREE.Color('#ffffff').lerp(new THREE.Color(color),kind==='wetrock'?.38:.12),
      normalScale:new THREE.Vector2(kind==='bark'?1.05:.7,kind==='bark'?1.05:.7),
      roughness:kind==='wetrock'?.54:.95,
      metalness:0,dithering:true,...options,
    })
    // Legacy terrain vertex tints described the entire surface; photographed
    // albedo already supplies its color. Retain only their broad variation.
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vColor.rgb = mix(vec3(1.0), sqrt(max(vColor.rgb,vec3(0.0))), 0.42);
        #endif`)
    }
    material.customProgramCacheKey=()=>`photographed-${kind}`
    material.userData.surfaceDetail=`photographed-${kind}`
    return material
  }
  const {albedo,relief,size}=getSurfacePixels(kind)
  const map=textureFrom(albedo,size,THREE.SRGBColorSpace)
  const bumpMap=textureFrom(relief,size)
  const material=new THREE.MeshStandardMaterial({
    color,
    map,
    bumpMap,
    roughnessMap:bumpMap,
    bumpScale:kind==='bark'?.09:kind==='rock'?.12:.055,
    roughness:.96,
    metalness:0,
    dithering:true,
    ...options,
  })
  material.userData.surfaceDetail=`procedural-${kind}`
  return material
}

/** Continuous photographic ground: gravel at the waterline, moss on shelves,
 * and exposed rock on steep slopes. World projection keeps cliffs unstretched. */
export const createLandscapeMaterial=(options={})=>{
  const material=createEnvironmentMaterial('#ffffff','grass',{vertexColors:true,...options})
  const grass=getNatureSurface('grass'),rock=getNatureSurface('rock'),soil=getNatureSurface('soil')
  if(!grass||!rock||!soil) return material
  const baseCompile=material.onBeforeCompile
  material.onBeforeCompile=shader=>{
    baseCompile(shader)
    shader.uniforms.landRock={value:rock.map}
    shader.uniforms.landSoil={value:soil.map}
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 vLandWorld;
      varying vec3 vLandNormal;`)
      .replace('#include <project_vertex>',`#include <project_vertex>
        vLandWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
        vLandNormal=normalize(mat3(modelMatrix)*objectNormal);`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D landRock;
      uniform sampler2D landSoil;
      varying vec3 vLandWorld;
      varying vec3 vLandNormal;`)
      .replace('#include <map_fragment>',`
        vec3 terrainNormal=normalize(vLandNormal);
        vec3 projectionWeight=pow(abs(terrainNormal),vec3(4.0));
        projectionWeight/=max(dot(projectionWeight,vec3(1.0)),0.001);
        vec3 groundColor=texture2D(map,vLandWorld.xz/3.2).rgb;
        vec3 earthColor=texture2D(landSoil,vLandWorld.xz/2.0).rgb;
        vec3 rockColor=texture2D(landRock,vLandWorld.zy/3.8).rgb*projectionWeight.x
          +texture2D(landRock,vLandWorld.xz/3.8).rgb*projectionWeight.y
          +texture2D(landRock,vLandWorld.xy/3.8).rgb*projectionWeight.z;
        float wetEdge=1.0-smoothstep(0.12,0.72,vLandWorld.y);
        float earthPatch=smoothstep(0.42,0.78,sin(vLandWorld.x*.31+sin(vLandWorld.z*.17))
          *cos(vLandWorld.z*.37)*.5+.5)*.32;
        float steep=1.0-smoothstep(.58,.89,abs(terrainNormal.y));
        vec3 groundAlbedo=mix(groundColor,earthColor,max(wetEdge*.88,earthPatch));
        groundAlbedo=mix(groundAlbedo,rockColor,steep*.92);
        groundAlbedo*=mix(.64,1.0,smoothstep(-.3,.3,vLandWorld.y));
        diffuseColor.rgb*=groundAlbedo;
      `)
  }
  material.customProgramCacheKey=()=> 'photographic-landscape-v1'
  material.userData.surfaceDetail='photographic-slope-blend'
  return material
}

export const projectGroundUV=(geometry,metersPerRepeat=3)=>{
  const position=geometry.getAttribute('position')
  const uv=new Float32Array(position.count*2)
  for(let index=0;index<position.count;index+=1){
    uv[index*2]=position.getX(index)/metersPerRepeat
    uv[index*2+1]=position.getZ(index)/metersPerRepeat
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  return geometry
}

export const createLeafTexture=()=>{
  const photographed=getNatureTexture('leaf-color')
  if(photographed&&getNatureTexture('leaf-alpha')) return photographed
  const size=64,pixels=new Uint8Array(size*size*4)
  for(let y=0;y<size;y+=1){
    for(let x=0;x<size;x+=1){
      const u=(x+.5)/size*2-1,v=(y+.5)/size
      const width=Math.pow(Math.sin(v*Math.PI),.75)*.89
      const edge=width-Math.abs(u)
      const vein=Math.exp(-Math.abs(u)*65)*.12+
        Math.pow(Math.max(0,Math.cos(v*45+Math.abs(u)*19)),18)*.035
      const shade=.7+v*.2+vein+hash(x,y)*.07
      const offset=(y*size+x)*4
      pixels[offset]=Math.round(255*shade)
      pixels[offset+1]=Math.round(255*shade)
      pixels[offset+2]=Math.round(238*shade)
      pixels[offset+3]=Math.round(THREE.MathUtils.clamp(edge*55,0,1)*255)
    }
  }
  const texture=textureFrom(pixels,size,THREE.SRGBColorSpace)
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping
  return texture
}

export const createFoliageMaterial=(color,map=createLeafTexture())=>{
  const detailed=map.userData.managedByNatureAssets
  const material=new THREE.MeshStandardMaterial({
    color:detailed?new THREE.Color('#ffffff').lerp(new THREE.Color(color),.23):color,
    map,alphaMap:detailed?getNatureTexture('leaf-alpha'):null,
    normalMap:detailed?getNatureTexture('leaf-normal'):null,
    normalScale:new THREE.Vector2(.25,.25),
    alphaTest:.45,side:THREE.DoubleSide,
    alphaToCoverage:true,
    roughness:.84,metalness:0,vertexColors:true,
  })
  material.forceSinglePass=true
  material.userData.surfaceDetail='individual-leaf-clusters'
  return material
}

// One mesh contains a whole crown, including gaps between clusters and individual leaf edges.
export const createFoliageGeometry=({seed=0,variant=0,scale=1,leaves=160}={})=>{
  const positions=[],normals=[],uvs=[],colors=[],indices=[]
  const shapes=[ [1.45,.95,1.3], [1.65,.7,1.35], [.95,1.35,.95], [1.3,1.05,1.25], [1.65,.62,1.3], [1.12,1.3,1.05] ]
  const shape=shapes[variant%shapes.length]
  const normal=new THREE.Vector3(),tangent=new THREE.Vector3(),bitangent=new THREE.Vector3()
  const center=new THREE.Vector3(),point=new THREE.Vector3()
  for(let leaf=0;leaf<leaves;leaf+=1){
    const cluster=leaf%7,clusterAngle=cluster*2.39996+seed*.13
    const azimuth=hash(leaf+seed*43,1)*Math.PI*2
    const elevation=hash(leaf+seed*43,2)*2-1
    const radius=Math.sqrt(1-elevation*elevation)*(.22+hash(leaf+seed*43,3)*.63)
    center.set(
      (Math.cos(clusterAngle)*.3+Math.cos(azimuth)*radius)*shape[0],
      (Math.sin(clusterAngle*1.7)*.19+elevation*.7)*shape[1],
      (Math.sin(clusterAngle)*.3+Math.sin(azimuth)*radius)*shape[2],
    ).multiplyScalar(scale)
    normal.set(Math.cos(azimuth),.3+hash(leaf+seed*43,4),Math.sin(azimuth)).normalize()
    tangent.set(-normal.z,0,normal.x).normalize()
    bitangent.crossVectors(normal,tangent).normalize()
    const length=(.09+hash(leaf+seed*43,5)*.07)*scale
    const width=length*(.45+hash(leaf+seed*43,6)*.3)
    const light=.72+hash(cluster+seed*5,7)*.35
    const offset=positions.length/3
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){
      point.copy(center).addScaledVector(tangent,(u-.5)*width*2).addScaledVector(bitangent,(v-.5)*length*2)
      positions.push(point.x,point.y,point.z)
      normals.push(normal.x,normal.y,normal.z)
      uvs.push(u,v)
      colors.push(light,light,light)
    }
    indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.userData={organicSilhouette:true,leaves,clusters:7}
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export const createRippleNormalMap=()=>{
  const size=128,pixels=new Uint8Array(size*size*4)
  const height=(u,v)=>noise(u*5,v*5,5)*.36+
    noise(u*17,v*17,17)*.12+noise(u*37,v*37,37)*.035
  const step=1/size
  for(let y=0;y<size;y+=1){
    for(let x=0;x<size;x+=1){
      const u=x/size,v=y/size
      const dx=(height(u+step,v)-height(u-step,v))*2.4
      const dy=(height(u,v+step)-height(u,v-step))*2.4
      const length=Math.hypot(dx,dy,1),offset=(y*size+x)*4
      pixels[offset]=Math.round((dx/length*.5+.5)*255)
      pixels[offset+1]=Math.round((dy/length*.5+.5)*255)
      pixels[offset+2]=Math.round((1/length*.5+.5)*255)
      pixels[offset+3]=255
    }
  }
  return textureFrom(pixels,size)
}
