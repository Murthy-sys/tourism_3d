import * as THREE from 'three'
import { describe,it,expect,vi } from 'vitest'
import { createWaterfallWorld,updateWaterfallWorld } from './waterfallWorld'
import { FINALE_CAMERAS,FINALE_GROUND_Y,WATERFALL,WATERFALL_OUTFLOW,WATERFALL_VIEWING_POSITIONS,getFinaleGroundHeight,sampleFinaleWater } from './finaleConfig'
import { disposeObject3D } from './primitives'

describe('waterfall finale',()=>{
  it.each(['desktop','mobile'])('connects the %s cascade to a sunken pool behind the viewing area',quality=>{
    const world=createWaterfallWorld(quality)
    world.updateMatrixWorld(true)
    const cascade=new THREE.Box3().setFromObject(world.getObjectByName('waterfall-cascade-1'))
    expect(cascade.max.y).toBeCloseTo(WATERFALL.height+.06+24*.2,4)
    expect(cascade.min.y).toBeCloseTo(WATERFALL.pool[1],1)
    expect(cascade.max.z).toBeLessThan(-148)
    expect(cascade.min.z).toBeLessThan(WATERFALL.center[2]-6)
    const pool=world.getObjectByName('waterfall-plunge-pool')
    expect(pool.position.toArray()).toEqual(WATERFALL.pool)
    expect(getFinaleGroundHeight(pool.position.x,pool.position.z)).toBeLessThan(pool.position.y-.5)
    WATERFALL_VIEWING_POSITIONS.forEach(([x,y,z])=>{
      expect(getFinaleGroundHeight(x,z)).toBeCloseTo(y,6)
      expect(y).toBe(FINALE_GROUND_Y)
      expect(z).toBeGreaterThan(WATERFALL.pool[2]+WATERFALL.poolRadius[1])
    })
    disposeObject3D(world)
  })

  it('shares a bounded set of meshes and freezes water motion under reduced motion',()=>{
    const world=createWaterfallWorld('mobile')
    let renderables=0
    world.traverse(object=>{if(object.isMesh||object.isPoints)renderables++})
    expect(renderables).toBeLessThanOrEqual(7)
    expect(world.getObjectByName('waterfall-bank-boulders').isInstancedMesh).toBe(true)
    updateWaterfallWorld(world,5,false)
    expect(world.userData.time.value).toBe(5)
    expect(world.userData.poolMaterial.normalMap.offset.x).toBeLessThan(0)
    updateWaterfallWorld(world,9,true)
    expect(world.userData.time.value).toBe(0)
    expect(world.userData.poolMaterial.normalMap.offset.toArray()).toEqual([0,0])
    const dispose=vi.spyOn(world.userData.poolMaterial.normalMap,'dispose')
    disposeObject3D(world)
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('retains the distant cascade backdrop while dissolving the high upland into sky',()=>{
    const world=createWaterfallWorld()
    try{
      for(const name of ['waterfall-rock-face','waterfall-bank-boulders']){
        const material=world.getObjectByName(name).material
        expect(material.alphaHash).toBe(false)
        expect(material.blending).toBe(THREE.CustomBlending)
        expect(material.blendSrc).toBe(THREE.SrcAlphaFactor)
        expect(material.blendDst).toBe(THREE.OneMinusSrcAlphaFactor)
        expect(material.alphaTest).toBeGreaterThan(0)
        expect(material.transparent).toBe(false)
        expect(material.depthWrite).toBe(true)
        const shader={
          uniforms:{},
          vertexShader:THREE.ShaderLib.standard.vertexShader,
          fragmentShader:THREE.ShaderLib.standard.fragmentShader,
        }
        material.onBeforeCompile(shader)
        expect(shader.vertexShader).toContain('instanceMatrix*cliffWorldPoint')
        expect(shader.vertexShader).toContain('(modelMatrix*cliffWorldPoint).y')
        expect(shader.fragmentShader).toContain('mix(1.0,0.12,smoothstep(90.0,300.0,cliffDistance))')
        expect(shader.fragmentShader).toContain('smoothstep(18.0,44.0,vCliffWorldHeight)')
        expect(shader.fragmentShader.indexOf('diffuseColor.a *= mix'))
          .toBeLessThan(shader.fragmentShader.indexOf('#include <alphatest_fragment>'))
        expect(shader.fragmentShader.indexOf('#undef OPAQUE'))
          .toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
        expect(material.customProgramCacheKey()).toContain('cliff-atmosphere')
        const distance=new THREE.Vector3(...FINALE_CAMERAS.desktop.camera)
          .distanceTo(new THREE.Vector3(...WATERFALL.center))
        expect(distance).toBeLessThan(material.userData.atmosphereFade.near)
        const opacityAt=(position,height=0)=>{
          const d=new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...WATERFALL.center))
          const {near,far,minimumOpacity,uplandFar,heightStart,heightEnd}=material.userData.atmosphereFade
          return THREE.MathUtils.lerp(
            THREE.MathUtils.lerp(1,minimumOpacity,THREE.MathUtils.smoothstep(d,near,far)),
            1-THREE.MathUtils.smoothstep(d,near,uplandFar),
            THREE.MathUtils.smoothstep(height,heightStart,heightEnd),
          )
        }
        expect(opacityAt([6,12,8])).toBeGreaterThan(.12)
        expect(opacityAt([6,12,400])).toBeCloseTo(.12,6)
        expect(opacityAt([4,4,WATERFALL.center[2]+75])).toBeGreaterThan(.95)
        // A long river view retains rock behind the full cascade, but the
        // 100m upland cannot form a gray cutout across the bright sky.
        const distant=[4,5,WATERFALL.center[2]+180]
        expect(opacityAt(distant,16)).toBeGreaterThan(.5)
        expect(opacityAt(distant,21)).toBeGreaterThan(.5)
        expect(opacityAt(distant,32)).toBeLessThan(opacityAt(distant,21))
        expect(opacityAt(distant,44)).toBe(0)
        expect(opacityAt(distant,100)).toBe(0)
        expect(opacityAt([4,4,WATERFALL.center[2]+50],44)).toBe(1)
      }
    }finally{disposeObject3D(world)}
  })

  it.each(['desktop','mobile'])('breaks the %s falling water into separate translucent streams',quality=>{
    const world=createWaterfallWorld(quality)
    try{
      for(const name of ['waterfall-cascade-1','waterfall-cascade-2']){
        const cascade=world.getObjectByName(name)
        const {geometry,material}=cascade
        const {streams,rows}=geometry.userData
        expect(streams).toBeGreaterThanOrEqual(5)
        const verticesPerStream=(rows+1)*3
        expect(geometry.attributes.position.count).toBe(streams*verticesPerStream)
        const triangles=geometry.index.array
        for(let index=0;index<triangles.length;index+=3){
          const stream=Math.floor(triangles[index]/verticesPerStream)
          expect(Math.floor(triangles[index+1]/verticesPerStream)).toBe(stream)
          expect(Math.floor(triangles[index+2]/verticesPerStream)).toBe(stream)
        }
        const uv=geometry.attributes.uv.array
        expect(Array.from(uv).every(value=>value>=0&&value<=1)).toBe(true)
        expect(new Set(geometry.attributes.flowSeed.array).size).toBe(streams)
        expect(material.transparent).toBe(true)
        expect(material.depthWrite).toBe(false)
        expect(material.opacity).toBeLessThan(.9)
        expect(material.userData.distantLandmark).toBe(true)
      }
    }finally{disposeObject3D(world)}
  })

  it('keeps waterfall impact details eligible for the distant river view',()=>{
    const world=createWaterfallWorld('mobile')
    try{
      for(const name of ['waterfall-impact-foam','waterfall-impact-spray']){
        const material=world.getObjectByName(name).material
        expect(material.userData.distantLandmark).toBe(true)
        expect(material.fog).toBe(true)
      }
    }finally{disposeObject3D(world)}
  })

  it('adds broken ledges and rock relief without exceeding the mobile geometry budget',()=>{
    const totals={}
    for(const quality of ['mobile','desktop']){
      const world=createWaterfallWorld(quality)
      try{
        let triangles=0
        world.traverse(object=>{
          if(!object.geometry) return
          Object.values(object.geometry.attributes).forEach(attribute=>{
            expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
          })
          object.geometry.computeBoundingSphere()
          expect(Number.isFinite(object.geometry.boundingSphere.radius)).toBe(true)
          if(object.isMesh){
            const indices=object.geometry.index?.count||object.geometry.attributes.position.count
            triangles+=indices/3*(object.isInstancedMesh?object.count:1)
          }
        })
        totals[quality]=triangles
        const rocks=world.getObjectByName('waterfall-bank-boulders')
        const matrix=new THREE.Matrix4(),position=new THREE.Vector3()
        let raisedLedges=0
        for(let index=0;index<rocks.count;index++){
          rocks.getMatrixAt(index,matrix)
          position.setFromMatrixPosition(matrix)
          if(position.y>2) raisedLedges++
        }
        expect(raisedLedges).toBeGreaterThanOrEqual(rocks.count/2)
        const cliff=world.getObjectByName('waterfall-rock-face').geometry
        const positions=cliff.attributes.position,normals=cliff.attributes.normal
        const rockDepth=[]
        for(let index=0;index<positions.count;index++){
          if(positions.getY(index)>2&&positions.getY(index)<14&&Math.abs(positions.getX(index)-WATERFALL.center[0])<24){
            rockDepth.push(positions.getZ(index))
          }
        }
        expect(Math.max(...rockDepth)-Math.min(...rockDepth)).toBeGreaterThan(1.5)
        expect(Array.from(normals.array).some(value=>Math.abs(value)>.95)).toBe(true)
      }finally{disposeObject3D(world)}
    }
    expect(totals.mobile).toBeLessThan(20000)
    expect(totals.desktop).toBeLessThan(45000)
    expect(totals.mobile).toBeLessThan(totals.desktop*.6)
  })

  it.each(['desktop','mobile'])('keeps one continuous %s water surface flowing past the far side of the people',quality=>{
    const world=createWaterfallWorld(quality)
    world.updateMatrixWorld(true)
    const water=world.getObjectByName('waterfall-plunge-pool')
    const ray=new THREE.Raycaster()
    let previousLevel=Infinity
    WATERFALL_OUTFLOW.forEach(([x,z,width,level])=>{
      expect(level).toBeLessThanOrEqual(previousLevel+.0001)
      previousLevel=level
      expect(getFinaleGroundHeight(x,z)).toBeLessThan(level-.8)
      ray.set(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0))
      const hits=ray.intersectObject(water)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].point.y).toBeCloseTo(level,1)
      if(x<12) expect(z+width).toBeLessThan(-142)
    })
    WATERFALL_VIEWING_POSITIONS.forEach(([x,y,z])=>{
      expect(sampleFinaleWater(x,z).edgeDistance).toBeGreaterThan(1)
      expect(getFinaleGroundHeight(x,z)).toBeCloseTo(y,5)
      ray.set(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(water)).toHaveLength(0)
    })
    const rim=water.geometry.attributes.position
    for(let i=0;i<rim.count;i++){
      const point=new THREE.Vector3().fromBufferAttribute(rim,i).applyMatrix4(water.matrixWorld)
      // The downstream end continues out of view; all visible side banks meet water.
      if(point.x>75) continue
      expect(Math.abs(point.y-getFinaleGroundHeight(point.x,point.z))).toBeLessThan(.05)
    }
    disposeObject3D(world)
  })

  it.each([
    ['desktop',1440/900,48],['desktop',21/9,48],['mobile',390/844,60],
  ])('fills the %s finale background with continuous hillside at aspect %s',(quality,aspect,fov)=>{
    const world=createWaterfallWorld(quality)
    world.updateMatrixWorld(true)
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,420)
    camera.position.set(...FINALE_CAMERAS[quality].camera)
    camera.lookAt(...FINALE_CAMERAS[quality].target)
    camera.updateMatrixWorld(true)
    const ray=new THREE.Raycaster()
    for(const x of [-.99,-.5,0,.5,.99]){
      for(const y of [.25,.65,.99]){
        ray.setFromCamera(new THREE.Vector2(x,y),camera)
        expect(ray.intersectObject(world.getObjectByName('waterfall-rock-face')).length).toBeGreaterThan(0)
      }
    }
    disposeObject3D(world)
  })

  it.each([
    ['desktop',1440/900,48],['mobile',390/844,60],
  ])('frames the falls and all four viewpoint positions on %s', (quality,aspect,fov)=>{
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,420)
    const frame=FINALE_CAMERAS[quality]
    camera.position.set(...frame.camera)
    camera.lookAt(new THREE.Vector3(...frame.target))
    camera.updateMatrixWorld(true)
    const anchors=[
      [WATERFALL.center[0],WATERFALL.height,WATERFALL.center[2]],
      WATERFALL.pool,
      ...WATERFALL_VIEWING_POSITIONS.flatMap(([x,y,z])=>[[x,y,z],[x,y+1.8,z]]),
    ]
    anchors.forEach(point=>{
      const projected=new THREE.Vector3(...point).project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(.96)
      expect(Math.abs(projected.y)).toBeLessThan(.96)
      expect(projected.z).toBeLessThan(1)
    })
    if(quality==='mobile'){
      const crest=new THREE.Vector3(WATERFALL.center[0],WATERFALL.height,WATERFALL.center[2]).project(camera)
      expect((1-crest.y)*844/2).toBeGreaterThan(285)
    }
  })
})
