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
  getProjectedObjectBounds,
  getRenderQuality,
  getRenderedWorldVisibility,
  getResolvedCameraFrame,
  getTransportWorldPosition,
  getWorldVisibility,
} from './indiaJourney'
import { createExpeditionController } from './expeditionController'
import { getJourneyState } from './journeyData'
import { createMaterials,disposeObject3D } from './primitives'

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
  it('holds the mobile coach composition and blends exactly into trekker framing',()=>{
    const state={
      cameraPosition:[8.5,3.8,46],
      cameraTarget:[-2,1.55,34.8],
      expedition:{activeTransport:'trekker'},
    }
    const transportPosition=[2,3.1,22]
    const frame=progress=>getResolvedCameraFrame({
      quality:'mobile',
      progress,
      state,
      transportPosition,
    })
    expect(frame(0)).toEqual({
      camera:[3.5,5.1,67],
      target:[-2.5,1.55,34.8],
    })
    expect(frame(.045)).toEqual(frame(0))
    const middle=frame(.08)
    expect(middle.camera[2]).toBeLessThan(frame(0).camera[2])
    expect(frame(.12)).toEqual(
      getMobileTransportCamera('trekker',transportPosition),
    )
  })
  it('leaves desktop and later mobile transport frames unchanged',()=>{
    const state={
      cameraPosition:[7,6,-19],
      cameraTarget:[2,1,-33],
      expedition:{activeTransport:'boat'},
    }
    expect(getResolvedCameraFrame({
      quality:'desktop',
      progress:.5,
      state,
      transportPosition:[-2,.25,-60],
    })).toEqual({camera:state.cameraPosition,target:state.cameraTarget})
    expect(getResolvedCameraFrame({
      quality:'mobile',
      progress:.5,
      state,
      transportPosition:[-2,.25,-60],
    })).toEqual(getMobileTransportCamera('boat',[-2,.25,-60]))
  })
  it('fully frames the production trekking party at desktop mountain entry',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'desktop')
    const state=getJourneyState(.12)
    const transition=controller.update(state.expedition,0,true)
    const transport=controller.transports.trekker
    const transportPosition=getTransportWorldPosition(
      'trekker',
      transport,
    ).toArray()
    const frame=getResolvedCameraFrame({
      quality:'desktop',
      progress:.12,
      state,
      transportPosition,
    })
    const camera=new THREE.PerspectiveCamera(48,1440/900,.1,420)
    camera.position.set(...frame.camera)
    camera.lookAt(...frame.target)
    const snapshot=getJourneyQASnapshot({
      state,
      transition,
      renderedWorlds:{mountain:true,water:false,forest:false},
      transports:controller.transports,
      scenery:controller.scenery,
      camera,
      cameraJump:0,
    })
    controller.dispose()
    Object.values(materials).forEach(material=>material.dispose())
    expect(snapshot).toMatchObject({
      visibleMembers:{guides:1,tourists:3},
      opening:{
        departureWeight:1,
        fullyFramedMembers:{guides:1,tourists:3},
      },
    })
  })
  it('keeps the production trekking party visible behind the brand overview',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'desktop')
    const state=getJourneyState(.21)
    const transition=controller.update(state.expedition,0,true)
    const transport=controller.transports.trekker
    const transportPosition=getTransportWorldPosition(
      'trekker',
      transport,
    ).toArray()
    const frame=getResolvedCameraFrame({
      quality:'desktop',
      progress:.21,
      state,
      transportPosition,
    })
    const camera=new THREE.PerspectiveCamera(48,1440/900,.1,420)
    camera.position.set(...frame.camera)
    camera.lookAt(...frame.target)
    const snapshot=getJourneyQASnapshot({
      state,
      transition,
      renderedWorlds:{mountain:true,water:false,forest:false},
      transports:controller.transports,
      scenery:controller.scenery,
      camera,
      cameraJump:0,
    })
    controller.dispose()
    Object.values(materials).forEach(material=>material.dispose())
    expect(snapshot.visibleMembers).toEqual({guides:1,tourists:3})
  })
  it('keeps all four production boat occupants visible at the distant forest reveal',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'desktop')
    const state=getJourneyState(.59)
    const transition=controller.update(state.expedition,0,true)
    const transport=controller.transports.boat
    const transportPosition=getTransportWorldPosition(
      'boat',
      transport,
    ).toArray()
    const frame=getResolvedCameraFrame({
      quality:'desktop',
      progress:.59,
      state,
      transportPosition,
    })
    const camera=new THREE.PerspectiveCamera(48,1440/900,.1,420)
    camera.position.set(...frame.camera)
    camera.lookAt(...frame.target)
    const snapshot=getJourneyQASnapshot({
      state,
      transition,
      renderedWorlds:{mountain:false,water:true,forest:true},
      transports:controller.transports,
      scenery:controller.scenery,
      camera,
      cameraJump:0,
    })
    controller.dispose()
    Object.values(materials).forEach(material=>material.dispose())
    expect(snapshot.visibleMembers).toEqual({guides:1,tourists:3})
    expect(snapshot.opening.fullyFramedMembers).toEqual({
      guides:1,
      tourists:3,
    })
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

  it('reports whether an object is rendered and fully inside the camera frame',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    const material=new THREE.MeshBasicMaterial()
    const centered=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material)
    centered.position.y=1
    centered.updateMatrixWorld(true)
    expect(getProjectedObjectBounds(centered,camera)).toMatchObject({
      rendered:true,
      fullyFramed:true,
    })
    centered.position.x=100
    centered.updateMatrixWorld(true)
    expect(getProjectedObjectBounds(centered,camera)).toMatchObject({
      rendered:false,
      fullyFramed:false,
    })
    centered.geometry.dispose()
    material.dispose()
  })

  it('does not project an object whose only mesh is hidden',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    const root=new THREE.Group()
    const hiddenMesh=new THREE.Mesh(
      new THREE.BoxGeometry(1,1,1),
      new THREE.MeshBasicMaterial(),
    )
    hiddenMesh.visible=false
    root.add(hiddenMesh)
    expect(getProjectedObjectBounds(root,camera)).toMatchObject({
      rendered:false,
      fullyFramed:false,
    })
    disposeObject3D(root)
  })

  it('does not project an object whose only mesh has zero opacity',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    const root=new THREE.Group()
    root.add(new THREE.Mesh(
      new THREE.BoxGeometry(1,1,1),
      new THREE.MeshBasicMaterial({opacity:0,transparent:true}),
    ))
    expect(getProjectedObjectBounds(root,camera)).toMatchObject({
      rendered:false,
      fullyFramed:false,
    })
    disposeObject3D(root)
  })

  it('does not project an object whose only mesh material is hidden',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    const root=new THREE.Group()
    const material=new THREE.MeshBasicMaterial()
    material.visible=false
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material))
    expect(getProjectedObjectBounds(root,camera)).toMatchObject({
      rendered:false,
      fullyFramed:false,
    })
    disposeObject3D(root)
  })

  it('excludes hidden oversized descendants from projected bounds',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,1,5)
    camera.lookAt(0,1,0)
    const root=new THREE.Group()
    const visibleMesh=new THREE.Mesh(
      new THREE.BoxGeometry(1,1,1),
      new THREE.MeshBasicMaterial(),
    )
    const hiddenOversizedMesh=new THREE.Mesh(
      new THREE.BoxGeometry(100,100,100),
      new THREE.MeshBasicMaterial(),
    )
    hiddenOversizedMesh.visible=false
    root.add(visibleMesh,hiddenOversizedMesh)
    expect(getProjectedObjectBounds(root,camera))
      .toEqual(getProjectedObjectBounds(visibleMesh,camera))
    disposeObject3D(root)
  })

  it('includes fail-closed coach and fully framed party evidence',()=>{
    const camera=new THREE.PerspectiveCamera(60,1,.1,100)
    camera.position.set(0,2,8)
    camera.lookAt(0,1,0)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    const coach=new THREE.Group()
    coach.add(new THREE.Mesh(
      new THREE.BoxGeometry(2,1,4),
      new THREE.MeshBasicMaterial(),
    ))
    const trekker=new THREE.Group()
    trekker.userData.members=['guide','tourist','tourist','tourist'].map((role,index)=>{
      const member=Object.assign(new THREE.Group(),{role})
      member.position.set((index-1.5)*.6,1,0)
      member.add(new THREE.Mesh(
        new THREE.BoxGeometry(.3,1,.3),
        new THREE.MeshBasicMaterial(),
      ))
      trekker.add(member)
      return member
    })
    const snapshot=getJourneyQASnapshot({
      state:{expedition:{phase:'mountain-trek',activeTransport:'trekker'}},
      transition:{
        worlds:{mountain:1,water:0,forest:0},
        transports:{trekker:1,boat:0,jeep:0},
        opening:{departureWeight:0},
      },
      renderedWorlds:{mountain:true,water:false,forest:false},
      transports:{trekker,boat:new THREE.Group(),jeep:new THREE.Group()},
      scenery:{coach},
      camera,
      cameraJump:0,
    })
    expect(snapshot.opening).toMatchObject({
      departureWeight:0,
      coach:{mounted:false,rendered:true,fullyFramed:true},
      fullyFramedMembers:{guides:1,tourists:3},
    })
    expect(snapshot.opening.coach.worldMatrix).toHaveLength(16)
    disposeObject3D(coach)
    disposeObject3D(trekker)
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
