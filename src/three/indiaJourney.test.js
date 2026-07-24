import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  createCameraJumpTracker,
  dampCameraVector,
  getAtmosphere,
  getCameraDampingFactor,
  getCameraRailJump,
  getDampingFactor,
  getJourneyQASnapshot,
  getMobileTransportCamera,
  getRenderQuality,
  getRenderedWorldVisibility,
  getTransportWorldPosition,
  getWorldVisibility,
} from './indiaJourney'

describe('renderer quality', () => {
  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('mountain')).toEqual([])
    expect(getWorldVisibility('handoff')).toEqual([])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile party, boat, and jeep at readable trailing distances',()=>{
    expect(getMobileTransportCamera('trekker',[2,1,-30])).toEqual({camera:[9,13,-15],target:[2,.8,-30]})
    expect(getMobileTransportCamera('boat',[-2,.25,-86])).toEqual({camera:[.4,1.75,-80.5],target:[-2,.75,-86]})
    expect(getMobileTransportCamera('jeep',[1,.2,-120])).toEqual({camera:[1.4,1.9,-114.3],target:[1,1.1,-120]})
  })
  it('frames the party around its members instead of its origin',()=>{
    const party=new THREE.Group()
    const guide=new THREE.Object3D()
    const tourist=new THREE.Object3D()
    guide.position.set(-1,1,-28)
    tourist.position.set(1,1,-32)
    party.add(guide,tourist)
    party.userData.members=[guide,tourist]
    expect(getTransportWorldPosition('trekker',party).toArray()).toEqual([0,1,-30])
  })
  it('uses delta-based damping and biome-weighted atmosphere',()=>{
    expect(getDampingFactor(0)).toBe(0)
    expect(getDampingFactor(1/60)).toBeCloseTo(1-Math.exp(-(1/60)*4.5),8)
    const atmosphere=getAtmosphere({mountain:.5,water:.5,forest:0})
    expect(atmosphere.fogNear).toBeGreaterThanOrEqual(18)
    expect(atmosphere.fogFar).toBeGreaterThan(100)
    expect(atmosphere.exposure).toBeGreaterThan(1)
    expect(atmosphere.background).toBeInstanceOf(THREE.Color)
  })
  it('keeps camera convergence tied to wall time when rendering stalls',()=>{
    expect(getCameraDampingFactor(1)).toBeGreaterThan(.85)
    expect(getCameraDampingFactor(1/60)).toBeCloseTo(getDampingFactor(1/60),8)
    expect(getCameraDampingFactor(1/15,'mobile'))
      .toBeLessThan(getCameraDampingFactor(1/15,'desktop'))
  })
  it('caps a mobile camera correction without changing its destination',()=>{
    const current=new THREE.Vector3(0,0,0)
    const destination=new THREE.Vector3(10,0,0)
    dampCameraVector(current,destination,.5,.68)
    expect(current.x).toBeCloseTo(.68)
    expect(destination.toArray()).toEqual([10,0,0])
  })
  it('measures local camera-rail continuity independently of render speed',()=>{
    ;[.08,.26,.35,.5,.59,.67,.84].forEach(progress=>{
      expect(getCameraRailJump(progress)).toBeLessThanOrEqual(.8)
    })
  })
  it('reports only weighted, ancestor-visible, opaque occupants projected into the camera',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    const member=(role,{x=0,opacity=1}={})=>{
      const root=Object.assign(new THREE.Group(),{role})
      const body=new THREE.Mesh(
        new THREE.BoxGeometry(.5,1,.5),
        new THREE.MeshBasicMaterial({opacity,transparent:opacity<1}),
      )
      root.position.set(x,1,0)
      root.add(body)
      return root
    }
    const hiddenTrekker=new THREE.Group()
    hiddenTrekker.userData.members=[
      member('guide'),
      member('tourist'),
      member('tourist'),
      member('tourist'),
    ]
    hiddenTrekker.userData.members.forEach(candidate=>{candidate.visible=false})
    const boat=new THREE.Group()
    const guide=member('guide')
    const hiddenByAncestor=member('tourist')
    const hiddenParent=new THREE.Group()
    hiddenParent.visible=false
    hiddenParent.add(hiddenByAncestor)
    const transparent=member('tourist',{opacity:0})
    const outside=member('tourist',{x:100})
    boat.add(guide,hiddenParent,transparent,outside)
    boat.userData.members=[guide,hiddenByAncestor,transparent,outside]
    boat.updateMatrixWorld(true)
    const state={expedition:{phase:'water-boat',activeTransport:'boat'}}
    const transition={
      worlds:{mountain:0,water:1,forest:0},
      transports:{trekker:0,boat:1,jeep:0},
    }
    const snapshot=getJourneyQASnapshot({
      state,
      transition,
      renderedWorlds:{mountain:false,water:true,forest:false},
      transports:{trekker:hiddenTrekker,boat,jeep:new THREE.Group()},
      camera,
      cameraJump:.125,
      consoleFailures:[],
      audioControls:0,
    })
    expect(snapshot).toMatchObject({
      phase:'water-boat',
      activeBiome:'water',
      activeTransport:'boat',
      biomeWeights:{mountain:0,water:1,forest:0},
      transportWeights:{trekker:0,boat:1,jeep:0},
      visibleMembers:{guides:1,tourists:0},
      distantVisibility:{
        nextBiome:false,
        nextBiomeName:'forest',
        mountain:false,
        water:true,
        forest:false,
      },
      cameraJump:.125,
      consoleFailures:[],
      audioControls:0,
    })
    const negligible=getJourneyQASnapshot({
      state,
      transition:{
        ...transition,
        transports:{trekker:0,boat:.005,jeep:0},
      },
      renderedWorlds:{mountain:false,water:true,forest:false},
      transports:{trekker:hiddenTrekker,boat,jeep:new THREE.Group()},
      camera,
      cameraJump:0,
    })
    expect(negligible.visibleMembers).toEqual({guides:0,tourists:0})
  })

  it('reports only materially weighted worlds projected into the camera frustum',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,2,5)
    camera.lookAt(0,0,0)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    const rootAt=(x,opacity=1)=>{
      const root=new THREE.Group()
      root.add(new THREE.Mesh(
        new THREE.BoxGeometry(2,2,2),
        new THREE.MeshBasicMaterial({opacity,transparent:opacity<1}),
      ))
      root.position.x=x
      root.updateMatrixWorld(true)
      return root
    }
    const visibility=getRenderedWorldVisibility({
      mountain:rootAt(100),
      water:rootAt(0),
      forest:rootAt(0),
    },{mountain:1,water:1,forest:0},camera)
    expect(visibility).toEqual({mountain:false,water:true,forest:false})
  })

  it('measures observed runtime camera movement and resets between QA states',()=>{
    const tracker=createCameraJumpTracker()
    const camera=new THREE.Vector3(0,0,0)
    const target=new THREE.Vector3(0,0,-1)
    tracker.reset(camera,target)
    camera.x=.42
    target.y=.18
    tracker.observe(camera,target)
    expect(tracker.value()).toBeCloseTo(.42)
    tracker.reset(camera,target)
    expect(tracker.value()).toBe(0)
    camera.x+=.09
    tracker.observe(camera,target)
    expect(tracker.value()).toBeCloseTo(.09)
  })
})
