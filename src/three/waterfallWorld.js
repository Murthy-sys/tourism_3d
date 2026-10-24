import * as THREE from 'three'
import { mesh } from './primitives'
import { createEnvironmentMaterial,createRippleNormalMap } from './environmentSurface'
import { attachNaturalReflection } from './naturalWater'
import { WATERFALL,WATERFALL_OUTFLOW,sampleFinaleWater } from './finaleConfig'
import { smootherstep } from './terrain'

const hash=value=>{const n=Math.sin(value*127.1+31.7)*43758.5453;return n-Math.floor(n)}
const noise=(x,y)=>{
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix+iy*137),hash(ix+1+iy*137),u),
    THREE.MathUtils.lerp(hash(ix+(iy+1)*137),hash(ix+1+(iy+1)*137),u),v,
  )
}
const named=(name,geometry,material,position,rotation)=>{
  const object=mesh(geometry,material,position,rotation)
  object.name=name
  return object
}

// Opaque fog cannot blend a distant cliff into the photographed cloud sky.
// Custom blending keeps the cliff in the opaque geography pass while smoothly
// revealing the actual sky. Distant discarded fragments do not occlude trees.
const addCliffAtmosphere=material=>{
  const compile=material.onBeforeCompile
  const cacheKey=material.customProgramCacheKey()
  material.alphaHash=false
  material.alphaTest=.005
  material.blending=THREE.CustomBlending
  material.blendSrc=THREE.SrcAlphaFactor
  material.blendDst=THREE.OneMinusSrcAlphaFactor
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer)
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
      diffuseColor.a *= 1.0-smoothstep(90.0,150.0,length(vViewPosition));
      #include <alphatest_fragment>
    `)
    // Three normally forces alpha to one for objects in the opaque queue.
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      #undef OPAQUE
      #include <opaque_fragment>
    `)
  }
  material.customProgramCacheKey=()=>`${cacheKey}-cliff-atmosphere-v3`
  material.userData.atmosphereFade={near:90,far:150}
  return material
}

const cliffHeight=x=>WATERFALL.height+smootherstep(2.7,26,Math.abs(x))*(11+Math.sin(x*.22)*2)+smootherstep(35,95,Math.abs(x))*18
const cliffDepth=(x,y,face,upland=0)=>{
  const ravine=smootherstep(2.8,7,Math.abs(x))
  const bedding=y*.23+Math.sin(x*.065)*.26+Math.sin(x*.27)*.08
  const bedFraction=bedding-Math.floor(bedding)
  const ledge=(.5-smootherstep(.74,.95,bedFraction))*(.18+noise(x*.18,y*.13)*.26)
  const fractured=(noise(x*.19,y*.085)-.5)*3.4+(noise(x*.76,y*.5)-.5)*.48
  const valleyCurve=Math.max(0,Math.abs(x)-24)**2*.008
  const relief=upland>0?ravine:THREE.MathUtils.lerp(.24,1,ravine)
  const erosion=(1-ravine)*(.45+noise(x*.7,y*.16)*.45)*(1-upland)
  return WATERFALL.center[2]-1.1+valleyCurve+(ledge+fractured)*relief-face*face*1.6-upland*90-erosion
}

const flowingWaterMaterial=(time,layer)=>{
  const material=new THREE.MeshStandardMaterial({
    color:layer?'#bdcfcb':'#a1bbb8',roughness:.19,metalness:0,
    transparent:true,opacity:layer?.36:.82,depthWrite:false,side:THREE.DoubleSide,
    dithering:true,
  })
  material.forceSinglePass=true
  material.userData.distantLandmark=true
  material.onBeforeCompile=shader=>{
    shader.uniforms.uFlowTime=time
    shader.vertexShader='uniform float uFlowTime;\nattribute float flowSeed;\nvarying float vFlowSeed;\nvarying vec2 vFallsUv;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFallsUv=uv;vFlowSeed=flowSeed;')
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      float falling=1.0-smoothstep(.88,.99,uv.y);
      float flutter=sin(uv.y*83.0+uFlowTime*9.0+flowSeed*31.0);
      transformed.x+=flutter*.035*falling;
      transformed.z+=sin(uv.y*47.0+uFlowTime*7.0+flowSeed*19.0)*.055*falling;
    `)
    shader.fragmentShader=`
      uniform float uFlowTime;
      varying float vFlowSeed;
      varying vec2 vFallsUv;
      float fallHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float fallNoise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(fallHash(i),fallHash(i+vec2(1,0)),f.x),
          mix(fallHash(i+vec2(0,1)),fallHash(i+vec2(1,1)),f.x),f.y);
      }
    `+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float height=clamp(vFallsUv.y/.94,0.0,1.0);
      vec2 flowing=vec2(vFallsUv.x*3.0+vFlowSeed*67.0,vFallsUv.y*19.0+uFlowTime*3.4);
      float threads=fallNoise(flowing)*.57+fallNoise(flowing*vec2(3.1,.48))*.43;
      float fine=fallNoise(flowing*vec2(6.2,.8));
      float edgeWidth=.03+fallNoise(vec2(height*31.0-uFlowTime*1.2,vFlowSeed*41.0))*.15;
      float edge=smoothstep(0.0,edgeWidth,vFallsUv.x)*smoothstep(0.0,edgeWidth,1.0-vFallsUv.x);
      float breakup=smoothstep(.14,.38,threads+(height*.14));
      float aeration=smoothstep(.22,.7,threads)*.78+pow(1.0-height,3.0)*.28;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.89,.87),clamp(aeration,0.0,.92));
      diffuseColor.rgb+=vec3(.09,.11,.1)*pow(fine,6.0);
      diffuseColor.a*=edge*breakup*(.4+threads*.6)*smoothstep(0.0,.018,vFallsUv.y);
    `)
  }
  material.customProgramCacheKey=()=>`waterfall-ribbons-v2-${layer}`
  material.userData.flowingWater=true
  return material
}

const createCliffGeometry=quality=>{
  const geometry=new THREE.PlaneGeometry(2,1,quality==='mobile'?110:170,quality==='mobile'?50:76)
  const positions=geometry.attributes.position
  const colors=[]
  const color=new THREE.Color()
  for(let i=0;i<positions.count;i++){
    const u=positions.getX(i),v=positions.getY(i)+.5
    const x=Math.sign(u)*Math.abs(u)**1.35*110
    const height=cliffHeight(x)
    const face=Math.min(v/.55,1)
    const upland=Math.max(0,(v-.55)/.45)
    const ravine=smootherstep(2.8,7,Math.abs(x))
    const mountainRise=upland**.7*(65+Math.sin(x*.08)*7)
    const channelRise=THREE.MathUtils.lerp(upland*18,mountainRise,smootherstep(.28,.6,upland))
    const uplandRise=THREE.MathUtils.lerp(channelRise,mountainRise,ravine)
    const y=face*(height+.4)-.4+uplandRise
    positions.setXYZ(i,x+WATERFALL.center[0],y,cliffDepth(x,y,face,upland))
    const damp=(1-smootherstep(2.2,6.5,Math.abs(x)))*(1-smootherstep(.03,.25,upland))
    const variation=noise(x*.18,y*.29)
    const moss=upland>.05&&noise(x*.12,y*.1)>.65
    color.set(moss?'#737b59':'#c2b8a5')
    color.multiplyScalar((.68+variation*.25)*(1-damp*.68))
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  const uvs=geometry.attributes.uv
  for(let i=0;i<positions.count;i++){
    uvs.setXY(i,positions.getX(i)/4,(positions.getY(i)-positions.getZ(i)*.28)/4)
  }
  geometry.userData={fracturedStrata:true,worldScaleUV:true}
  geometry.computeVertexNormals()
  return geometry
}

const createRiverGeometry=quality=>{
  const shape=new THREE.Shape()
  const arcSegments=quality==='mobile'?56:88
  // Leave an opening in the eastern pool bank, then trace both river banks.
  for(let i=0;i<=arcSegments;i++){
    const angle=.7+(Math.PI*2-1.4)*i/arcSegments
    const x=WATERFALL.pool[0]+Math.cos(angle)*WATERFALL.poolRadius[0]
    const z=WATERFALL.pool[2]+Math.sin(angle)*WATERFALL.poolRadius[1]
    if(i===0) shape.moveTo(x,z)
    else shape.lineTo(x,z)
  }
  WATERFALL_OUTFLOW.forEach(([x,z,width])=>shape.lineTo(x,z-width))
  for(let i=WATERFALL_OUTFLOW.length-1;i>=0;i--){
    const [x,z,width]=WATERFALL_OUTFLOW[i]
    shape.lineTo(x,z+width)
  }
  shape.closePath()
  const geometry=new THREE.ShapeGeometry(shape)
  const positions=geometry.attributes.position,uvs=geometry.attributes.uv
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getY(i)
    const level=sampleFinaleWater(x,z).level
    positions.setXYZ(i,x-WATERFALL.pool[0],level-WATERFALL.pool[1],z-WATERFALL.pool[2])
    uvs.setXY(i,x*.125,z*.125)
  }
  // ShapeGeometry is wound in XY. Mapping its Y to world Z reverses its normal.
  const indices=geometry.index.array
  for(let i=0;i<indices.length;i+=3){const a=indices[i];indices[i]=indices[i+2];indices[i+2]=a}
  geometry.computeVertexNormals()
  return geometry
}

const createSheetGeometry=(quality,layer)=>{
  const streams=layer?(quality==='mobile'?7:11):5
  const rows=quality==='mobile'?42:68
  const positions=[],uvs=[],seeds=[],indices=[]
  const spacing=WATERFALL.width/streams
  for(let stream=0;stream<streams;stream++){
    const seed=hash(stream+layer*37+9)
    const center=-WATERFALL.width*.5+(stream+.5)*spacing+(seed-.5)*spacing*.24
    const offset=positions.length/3
    for(let row=0;row<=rows;row++){
      const v=row/rows,face=Math.min(v/.94,1)
      const spread=1+(1-face)**1.7*.27
      const upstream=Math.max(0,(v-.94)/.06)*24
      const split=Math.sin(face*(5.4+seed*4)+seed*19)*.21*Math.sin(face*Math.PI)
      const width=spacing*(layer?.3:.76+seed*.38)*(1+(1-face)*.22)
      for(let column=0;column<3;column++){
        const u=column/2,x=(center+(u-.5)*width)*spread+split
        positions.push(
          WATERFALL.center[0]+x,
          face*WATERFALL.height+.06+layer*.015+upstream*.2,
          WATERFALL.center[2]+.4-2.3*smootherstep(.78,1,face)+(1-face)**3*1.6-upstream+
            Math.sin(face*19+seed*13)*.07+seed*.08+layer*.17+Math.sin(u*Math.PI)*.045,
        )
        uvs.push(u,v)
        seeds.push(seed)
        if(row<rows&&column<2){
          const a=offset+row*3+column,b=a+3
          indices.push(a,a+1,b,a+1,b+1,b)
        }
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('flowSeed',new THREE.Float32BufferAttribute(seeds,1))
  geometry.setIndex(indices)
  geometry.userData={streams,rows,separatedRibbons:true}
  geometry.computeVertexNormals()
  return geometry
}

const createSpray=(quality,time)=>{
  const count=quality==='mobile'?140:260
  const positions=new Float32Array(count*3),seeds=new Float32Array(count)
  for(let i=0;i<count;i++){
    positions.set([WATERFALL.center[0],.3,WATERFALL.center[2]+2],i*3)
    seeds[i]=hash(i+3)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
  geometry.setAttribute('spraySeed',new THREE.BufferAttribute(seeds,1))
  const material=new THREE.PointsMaterial({color:'#d6e2df',size:.4,transparent:true,opacity:.36,depthWrite:false,sizeAttenuation:true})
  material.userData.distantLandmark=true
  material.onBeforeCompile=shader=>{
    shader.uniforms.uFlowTime=time
    shader.vertexShader='uniform float uFlowTime;\nattribute float spraySeed;\nvarying float vSprayAge;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      float age=fract(uFlowTime*(.23+spraySeed*.14)+spraySeed);
      float angle=spraySeed*79.0;
      vSprayAge=age;
      transformed.x+=cos(angle)*(.5+age*2.3)+age*.75;
      transformed.y+=sin(age*3.14159)*(.7+spraySeed*1.7);
      transformed.z+=sin(angle)*(.5+age*1.6);
    `)
    shader.vertexShader=shader.vertexShader.replace('#include <logdepthbuf_vertex>',`
      gl_PointSize*=mix(.18,3.1,step(.68,spraySeed))*(.5+vSprayAge*.85);
      #include <logdepthbuf_vertex>
    `)
    shader.fragmentShader='varying float vSprayAge;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 pointUv=gl_PointCoord-.5;
      float pointEdge=exp(-dot(pointUv,pointUv)*15.0)*(1.0-smoothstep(.35,.5,length(pointUv)));
      diffuseColor.a*=pointEdge*sin(vSprayAge*3.14159);
    `)
  }
  material.customProgramCacheKey=()=> 'waterfall-impact-mist-v2'
  const spray=new THREE.Points(geometry,material)
  spray.name='waterfall-impact-spray'
  spray.frustumCulled=false
  return spray
}

export function createWaterfallWorld(quality='desktop'){
  const group=new THREE.Group()
  group.name='waterfall-finale'
  const time={value:0}
  const rock=addCliffAtmosphere(createEnvironmentMaterial('#929b8c','rock',{vertexColors:true,bumpScale:.16,roughness:.9}))
  rock.color.set('#929b8c')
  rock.map.repeat.set(1,1)
  rock.bumpMap?.repeat.set(1,1)
  const cliff=named('waterfall-rock-face',createCliffGeometry(quality),rock)
  group.add(cliff)

  const boulderMaterial=addCliffAtmosphere(createEnvironmentMaterial('#b3aea0','wetrock',{bumpScale:.18,roughness:.72}))
  boulderMaterial.color.set('#8b9486')
  const boulderGeometry=new THREE.IcosahedronGeometry(1,1)
  const rockPositions=boulderGeometry.attributes.position
  for(let i=0;i<rockPositions.count;i++){
    const x=rockPositions.getX(i),y=rockPositions.getY(i),z=rockPositions.getZ(i)
    const fracture=.83+noise(x*3.2+z*.7,y*2.7)*.34
    rockPositions.setXYZ(i,x*fracture,y*(.86+noise(x*4,z*3)*.23),z*fracture)
  }
  boulderGeometry.computeVertexNormals()
  const boulderCount=quality==='mobile'?48:84
  const rocks=new THREE.InstancedMesh(boulderGeometry,boulderMaterial,boulderCount)
  rocks.name='waterfall-bank-boulders'
  const dummy=new THREE.Object3D()
  const rockTint=new THREE.Color()
  for(let i=0;i<boulderCount;i++){
    const side=i%2?-1:1
    const ledge=i>=boulderCount*.5
    const scale=.48+hash(i+21)*(ledge?1.7:1.5)
    const x=WATERFALL.center[0]+side*((ledge?2.9+scale*1.7:4.8)+hash(i+7)*20)
    const y=ledge?2.3+hash(i+12)*17:scale*.31
    const localX=x-WATERFALL.center[0]
    const z=ledge
      ?cliffDepth(localX,y,(y+.4)/(cliffHeight(localX)+.4))-scale*1.05
      :WATERFALL.center[2]+1.7+hash(i+11)*3.4
    dummy.position.set(x,y,z)
    dummy.rotation.set(hash(i)*.8,hash(i+3)*6,hash(i+2)*.5)
    dummy.scale.set(scale*(ledge?1.7:1),scale*(ledge?.55:.6+hash(i+13)),scale*(ledge?1.1:.8))
    dummy.updateMatrix()
    rocks.setMatrixAt(i,dummy.matrix)
    rockTint.set(ledge?'#c7c1af':'#999f8e').multiplyScalar(.75+hash(i+17)*.24)
    rocks.setColorAt(i,rockTint)
  }
  rocks.userData={bankCount:boulderCount/2,ledgeCount:boulderCount/2,fracturedRock:true}
  rocks.castShadow=quality!=='mobile'
  rocks.receiveShadow=true
  group.add(rocks)

  const poolMaterial=new THREE.MeshPhysicalMaterial({
    color:'#314e43',roughness:.23,metalness:0,clearcoat:.65,clearcoatRoughness:.18,
    normalMap:createRippleNormalMap(),normalScale:new THREE.Vector2(.16,.16),
  })
  poolMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uFlowTime=time
    shader.vertexShader='varying vec2 vRiverUv;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvRiverUv=uv;')
    shader.fragmentShader='uniform float uFlowTime;\nvarying vec2 vRiverUv;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float downstream=vRiverUv.x*10.0-uFlowTime*1.8;
      float ripples=sin(downstream+sin(vRiverUv.y*22.0)*1.8);
      float glints=pow(max(0.0,ripples),8.0)*(.5+.5*sin(vRiverUv.y*48.0+downstream*.2));
      diffuseColor.rgb+=vec3(.035,.045,.035)*glints;
    `)
  }
  poolMaterial.customProgramCacheKey=()=> 'waterfall-river-flow'
  const pool=named('waterfall-plunge-pool',createRiverGeometry(quality),poolMaterial,WATERFALL.pool)
  attachNaturalReflection(pool,{quality,level:0})
  pool.userData.outflow=WATERFALL_OUTFLOW
  pool.castShadow=false
  group.add(pool)
  for(let layer=0;layer<2;layer++){
    const sheet=named(`waterfall-cascade-${layer+1}`,createSheetGeometry(quality,layer),flowingWaterMaterial(time,layer))
    sheet.castShadow=false
    sheet.receiveShadow=false
    group.add(sheet)
  }
  const foamMaterial=new THREE.MeshBasicMaterial({color:'#dbe5df',transparent:true,opacity:.75,depthWrite:false})
  foamMaterial.userData.distantLandmark=true
  const foam=named('waterfall-impact-foam',new THREE.CircleGeometry(1,64),foamMaterial,[WATERFALL.center[0],WATERFALL.pool[1]+.015,WATERFALL.center[2]+2.3],[-Math.PI/2,0,0])
  foam.scale.set(3.3,1.65,1)
  foam.castShadow=false
  foamMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uFlowTime=time
    shader.vertexShader='varying vec2 vFoamUv;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFoamUv=uv;')
    shader.fragmentShader=`
      uniform float uFlowTime;
      varying vec2 vFoamUv;
      float foamHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float foamNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(foamHash(i),foamHash(i+vec2(1,0)),f.x),
          mix(foamHash(i+vec2(0,1)),foamHash(i+vec2(1,1)),f.x),f.y);
      }
    `+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 foamFlow=vFoamUv*17.0+vec2(-uFlowTime*.47,uFlowTime*.12);
      float swirls=foamNoise(foamFlow+foamNoise(foamFlow*.37)*3.0);
      float bubbles=foamNoise(foamFlow*3.8);
      float radius=length(vFoamUv-.5)*2.0;
      float brokenEdge=1.0-smoothstep(.3,.98,radius+swirls*.18);
      float lace=smoothstep(.43,.63,swirls)*(.38+.62*smoothstep(.28,.72,bubbles));
      diffuseColor.a*=brokenEdge*(.24+lace*.76);
    `)
  }
  foamMaterial.customProgramCacheKey=()=> 'waterfall-impact-foam-v2'
  group.add(foam,createSpray(quality,time))
  group.userData={time,poolMaterial,center:new THREE.Vector3(...WATERFALL.center),quality}
  return group
}

export function updateWaterfallWorld(group,elapsed,reducedMotion){
  const time=reducedMotion?0:elapsed
  group.userData.time.value=time
  group.userData.poolMaterial.normalMap.offset.set(time===0?0:-time*.025,time*.003)
}
