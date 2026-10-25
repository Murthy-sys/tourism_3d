import * as THREE from 'three'
import * as IndiaJourney from './indiaJourney'
import { describe, expect, it, vi } from 'vitest'
import {
  createAdaptivePixelRatioController,
  createCameraJumpTracker,
  dampCameraVector,
  getAtmosphere,
  getCameraDampingFactor,
  getCameraMaximumStep,
  getCameraRailJump,
  getDampingFactor,
  getJourneyQASnapshot,
  getMobileTransportCamera,
  getTransportCamera,
  getProjectedObjectBounds,
  getRendererProfile,
  getRenderQuality,
  getRenderedWorldVisibility,
  getResolvedCameraFrame,
  getTransportWorldPosition,
  getWorldVisibility,
} from './indiaJourney'
import { createExpeditionController } from './expeditionController'
import { getJourneyState } from './journeyData'
import { getCityCameraFrame } from './cityJourney'
import { WATERFALL } from './finaleConfig'
import { createMaterials,disposeObject3D } from './primitives'
import { createTrekkingParty,updateTrekkingParty } from './trekkingParty'
import { createExpeditionBoat,updateBoat } from './expeditionVehicles'
import { journeyProgressToScroll,scrollToJourneyProgress,JOURNEY_TRAVEL_SCREENS } from '../journey/scrollTimeline'

describe('journey progress controller',()=>{
  it.each([.07,.20,.50,.80])(
    'finishes manual scrolling promptly at progress %s instead of queueing travel',initial=>{
      for(const quality of ['desktop','mobile']) for(const direction of [-1,1]){
        for(const fps of [20,60,120]){
          const controller=IndiaJourney.createJourneyProgressController({initial,quality})
          const origin=journeyProgressToScroll(initial)
          let target=initial,previous=initial
          // A 900 px wheel burst across 600 ms on a 900 px viewport.
          for(let frame=1;frame<=fps*.6;frame++){
            target=scrollToJourneyProgress(origin+direction*(frame/(fps*.6))/JOURNEY_TRAVEL_SCREENS)
            controller.setTarget(target,{navigation:false})
            const value=controller.advance(1/fps)
            expect(direction*(value-previous)).toBeGreaterThanOrEqual(-1e-12)
            expect(direction*(target-value)).toBeGreaterThanOrEqual(-1e-12)
            previous=value
          }
          // Keep delivering redundant React prop updates during idle, as in production.
          for(let frame=0;frame<Math.ceil(fps*.25);frame++){
            controller.setTarget(target)
            controller.advance(1/fps)
          }
          expect(controller.value()).toBe(target)
          for(let frame=0;frame<fps*3;frame++) controller.advance(1/fps)
          expect(controller.value()).toBe(target)
        }
      }
    },
  )

  it('smooths small wheel steps without increasing their distance',()=>{
    for(const initial of [.07,.2,.5,.8]){
      const controller=IndiaJourney.createJourneyProgressController({initial})
      const target=scrollToJourneyProgress(journeyProgressToScroll(initial)+30/900/JOURNEY_TRAVEL_SCREENS)
      controller.setTarget(target)
      const first=controller.advance(1/60)
      expect(first).toBeGreaterThan(initial)
      expect(first).toBeLessThan(target)
      for(let frame=0;frame<15;frame++) controller.advance(1/60)
      expect(controller.value()).toBe(target)
    }
  })

  it('reverses manual movement immediately and settles at the latest scroll position',()=>{
    const controller=IndiaJourney.createJourneyProgressController({initial:.5})
    controller.setTarget(.53)
    for(let frame=0;frame<5;frame++) controller.advance(1/60)
    let previous=controller.value()
    controller.setTarget(.49,{navigation:false})
    for(let frame=0;frame<20;frame++){
      const value=controller.advance(1/60)
      expect(value).toBeLessThanOrEqual(previous)
      expect(value).toBeGreaterThanOrEqual(.49)
      previous=value
    }
    expect(controller.value()).toBe(.49)
  })
  it('finishes long chapter navigation without slowing to a crawl near its destination',()=>{
    for(const destination of [.07,.21,.56,.87,.995]){
      const controller=IndiaJourney.createJourneyProgressController()
      for(let frame=0;frame<8*60;frame++){
        const t=Math.min(1,frame/(.9*60))
        controller.setTarget(destination*t*t*t*(t*(t*6-15)+10),{navigation:true})
        controller.advance(1/60)
      }
      expect(controller.value()).toBe(destination)
      controller.setTarget(destination-.001)
      const before=controller.value()
      controller.advance(1/60)
      expect(controller.value()).toBeLessThan(before)
    }
  })
  it('advances through slow foreground frames while excluding suspended time',()=>{
    const controller=IndiaJourney.createJourneyProgressController({quality:'desktop'})
    controller.setTarget(.5,{navigation:true})
    for(let frame=0;frame<30;frame++) controller.advance(IndiaJourney.getActiveFrameDelta(.4))
    expect(controller.value()).toBe(.5)
    expect(IndiaJourney.getActiveFrameDelta(1/60)).toBe(1/60)
    expect(IndiaJourney.getActiveFrameDelta(30)).toBe(30)
    expect(IndiaJourney.getActiveFrameDelta(Infinity)).toBe(Infinity)
  })
  it('bounds motion after a foreground stall without hiding frame pressure from quality adaptation',()=>{
    expect(IndiaJourney.getMotionFrameDelta(1/60)).toBe(1/60)
    expect(IndiaJourney.getMotionFrameDelta(0)).toBe(0)
    for(const elapsed of [.08,.24,.4,1.99]){
      expect(IndiaJourney.getMotionFrameDelta(IndiaJourney.getActiveFrameDelta(elapsed))).toBe(.05)
    }
    expect(IndiaJourney.getActiveFrameDelta(.4)).toBe(.24)
    for(const elapsed of [-1,2,30,NaN,Infinity]){
      expect(IndiaJourney.getMotionFrameDelta(elapsed)).toBe(0)
    }
  })
  it('advances one controller once per frame and returns its rendered progress',()=>{
    const controller=IndiaJourney.createJourneyProgressController({
      quality:'desktop',
    })
    controller.setTarget(1,{navigation:true})

    const rendered=IndiaJourney.advanceJourneyFrame(controller,1/60)

    expect(rendered).toBeCloseTo(.35/60/60,8)
    expect(controller.value()).toBe(rendered)
  })

  it.each([
    ['mobile',.18/60],
    ['desktop',.22/60],
  ])('bounds the first %s frame after a zero-to-one jump',(quality,maximum)=>{
    const controller=IndiaJourney.createJourneyProgressController({quality})
    controller.setTarget(1,{navigation:true})
    controller.advance(1/60)
    expect(controller.value()).toBeGreaterThan(0)
    expect(controller.value()).toBeLessThanOrEqual(maximum)
  })

  it('never advances past its target',()=>{
    const controller=IndiaJourney.createJourneyProgressController({
      quality:'desktop',
      initial:.98,
    })
    controller.setTarget(1)
    for(let frame=0;frame<100;frame++){
      controller.advance(.25)
      expect(controller.value()).toBeLessThanOrEqual(controller.target())
    }
    expect(controller.value()).toBe(1)
  })

  it('converges consistently over one second at common frame rates',()=>{
    const values=[20,30,60,120].map(fps=>{
      const controller=IndiaJourney.createJourneyProgressController({quality:'mobile'})
      controller.setTarget(1)
      for(let frame=0;frame<fps;frame++) controller.advance(1/fps)
      return controller.value()
    })
    expect(Math.max(...values)-Math.min(...values)).toBeLessThanOrEqual(.02)
  })

  it('ignores invalid and suspended frame deltas',()=>{
    const controller=IndiaJourney.createJourneyProgressController({quality:'desktop'})
    controller.setTarget(1)
    ;[Infinity,NaN,.251].forEach(delta=>controller.advance(delta))
    expect(controller.value()).toBe(0)
  })

  it('snaps to its target when reduced motion is enabled',()=>{
    const controller=IndiaJourney.createJourneyProgressController({quality:'mobile'})
    controller.setTarget(1)
    controller.setReducedMotion(true)
    controller.advance(1/60)
    expect(controller.value()).toBe(1)
  })

  it('clamps initial and target progress to the unit interval',()=>{
    const controller=IndiaJourney.createJourneyProgressController({
      quality:'mobile',
      initial:2,
    })
    expect(controller.value()).toBe(1)
    expect(controller.target()).toBe(1)
    controller.setTarget(-3)
    expect(controller.target()).toBe(0)
  })

  it('does not retain a long wheel backlog after fast repeated input',()=>{
    for(const screens of [1.99,2.01,3]){
      const controller=IndiaJourney.createJourneyProgressController({initial:.46})
      const target=scrollToJourneyProgress(journeyProgressToScroll(.46)+screens/JOURNEY_TRAVEL_SCREENS)
      controller.setTarget(target,{navigation:false})
      for(let frame=0;frame<15;frame++) controller.advance(1/60)
      expect(controller.value()).toBe(target)
    }
  })

  it('retains explicit seek intent across redundant prop updates and returns to wheel pace',()=>{
    const controller=IndiaJourney.createJourneyProgressController({initial:.46})
    controller.setTarget(.58,{navigation:true})
    for(let frame=0;frame<60;frame++){
      controller.setTarget(.58)
      controller.advance(1/60)
    }
    expect(controller.value()).toBeGreaterThan(.55)
    controller.setTarget(controller.value()+.003,{navigation:false})
    const previous=controller.value()
    controller.advance(1/60)
    expect(controller.value()).toBeGreaterThan(previous)
    expect(controller.value()).toBeLessThan(controller.target())
    for(let frame=0;frame<15;frame++) controller.advance(1/60)
    expect(controller.value()).toBe(controller.target())
  })
})

describe('renderer quality', () => {
  it('keeps framing fixed while the walking party and boat animate in place',()=>{
    const materials=createMaterials()
    const party=createTrekkingParty(materials),boat=createExpeditionBoat(materials)
    const parent=new THREE.Group()
    parent.position.set(3,2,-8)
    parent.rotation.y=.7
    parent.scale.setScalar(1.2)
    parent.add(party,boat)
    const route=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,.35,0),new THREE.Vector3(0,.35,-30),
    ])
    const anchors={trekker:[],boat:[]},boatHeights=[],partyHeights=[]
    try{
      for(const elapsed of [0,.17,.43,1.1,3.4]){
        updateTrekkingParty(party,route,.3,elapsed,false,()=>.35)
        updateBoat(boat,route,.5,elapsed,false)
        anchors.trekker.push(getTransportWorldPosition('trekker',party))
        anchors.boat.push(getTransportWorldPosition('boat',boat))
        boatHeights.push(boat.position.y)
        partyHeights.push(party.userData.members[0].position.y)
      }
      Object.values(anchors).forEach(values=>values.forEach(value=>{
        expect(value.distanceTo(values[0])).toBeLessThan(1e-8)
      }))
      expect(Math.max(...boatHeights)-Math.min(...boatHeights)).toBeGreaterThan(.02)
      expect(Math.max(...partyHeights)-Math.min(...partyHeights)).toBeGreaterThan(.005)
    }finally{
      disposeObject3D(parent)
      Object.values(materials).forEach(material=>material.dispose())
    }
  })
  it('restores clarity after sustained healthy 60Hz frames without needing a high-refresh display',()=>{
    const controller=createAdaptivePixelRatioController(1.75,{warmupMs:0,cooldownMs:0})
    for(let i=0;i<34;i++) controller.observe(30)
    expect(controller.value()).toBe(1.5)
    for(let i=0;i<120;i++) controller.observe(1000/60)
    expect(controller.value()).toBe(1.5)
    for(let i=0;i<64;i++) controller.observe(1000/60)
    expect(controller.value()).toBe(1.75)
  })
  it('ignores warm-up and isolated slow mobile frames',()=>{
    const controller=createAdaptivePixelRatioController(1.75,{
      warmupFrames:3,
      sampleFrames:4,
      cooldownFrames:3,
      slowFrameMs:22,
    })
    ;[40,40,40,16,16,40,16].forEach(ms=>
      expect(controller.observe(ms)).toBeNull()
    )
    expect(controller.value()).toBe(1.75)
  })

  it('ignores suspended and non-finite frame gaps in healthy samples',()=>{
    ;[500,Infinity,NaN].forEach(gap=>{
      const controller=createAdaptivePixelRatioController(1.75,{
        warmupFrames:0,
        sampleFrames:4,
        cooldownFrames:0,
        slowFrameMs:22,
      })
      expect([16,16,gap,16,16].map(ms=>controller.observe(ms)))
        .toEqual([null,null,null,null,null])
      expect(controller.value()).toBe(1.75)
    })
  })

  it('steps down only after sustained slow rendering and respects its floor',()=>{
    const controller=createAdaptivePixelRatioController(1.75,{
      warmupFrames:0,
      sampleFrames:3,
      cooldownFrames:2,
      slowFrameMs:22,
    })
    expect([30,30,30].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.5])
    expect([30,30].map(ms=>controller.observe(ms))).toEqual([null,null])
    expect([30,30,30].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.25])
    expect([40,40,40].map(ms=>controller.observe(ms)))
      .toEqual([null,null,null])
    expect(controller.value()).toBe(1.25)
  })

  it('recovers pixel ratio toward its ceiling once frames run comfortably fast',()=>{
    const controller=createAdaptivePixelRatioController(1.75,{
      warmupFrames:0,
      sampleFrames:3,
      cooldownFrames:0,
      slowFrameMs:22,
      fastFrameMs:12,
    })
    expect([30,30,30].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.5])
    expect([30,30,30].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.25])
    expect([10,10,10].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.5])
    expect([10,10,10].map(ms=>controller.observe(ms)))
      .toEqual([null,null,1.75])
    // never climbs above the initial ceiling
    expect([10,10,10].map(ms=>controller.observe(ms)))
      .toEqual([null,null,null])
    expect(controller.value()).toBe(1.75)
  })

  it('keeps default adaptation windows stable in wall time across frame rates',()=>{
    const firstDowngradeAt=fps=>{
      const controller=createAdaptivePixelRatioController(1.75,{
        slowFrameMs:10,
      })
      const frameMs=1000/fps
      for(let elapsed=frameMs;elapsed<=8000;elapsed+=frameMs){
        if(controller.observe(frameMs)!==null) return elapsed
      }
      return null
    }
    const downgradeTimes=[20,30,60].map(firstDowngradeAt)
    expect(downgradeTimes).not.toContain(null)
    expect(downgradeTimes.every(elapsed=>elapsed<=3000)).toBe(true)
    expect(Math.max(...downgradeTimes)-Math.min(...downgradeTimes))
      .toBeLessThanOrEqual(100)
  })

  it('starts mobile rendering sharp without exceeding its safe cap',()=>{
    expect(getRendererProfile(390,1)).toEqual({
      quality:'mobile',
      antialias:true,
      pixelRatio:1.25,
    })
    expect(getRendererProfile(390,1.5).pixelRatio).toBe(1.5)
    expect(getRendererProfile(390,3).pixelRatio).toBe(1.75)
  })

  it('preserves the desktop renderer profile',()=>{
    expect(getRendererProfile(1440,3)).toEqual({
      quality:'desktop',
      antialias:true,
      pixelRatio:2,
    })
  })

  it('preserves a desktop device pixel ratio below one',()=>{
    expect(getRendererProfile(1440,.8)).toEqual({
      quality:'desktop',
      antialias:true,
      pixelRatio:.8,
    })
  })

  it('adapts desktop resolution after sustained pressure and can recover',()=>{
    const desktop=getRendererProfile(1440,3)
    expect(desktop.quality).toBe('desktop')
    const controller=createAdaptivePixelRatioController(desktop.pixelRatio,{
      pixelRatios:[.75,1,1.25,1.5,1.75,2],warmupFrames:0,sampleFrames:3,cooldownFrames:0,
    })
    expect([30,30,30].map(ms=>controller.observe(ms))).toEqual([null,null,1.75])
    for(let i=0;i<12;i++) controller.observe(30)
    expect(controller.value()).toBe(.75)
    for(let i=0;i<3;i++) controller.observe(10)
    expect(controller.value()).toBe(1)
  })

  it('applies an adaptive downgrade from the frame delta and ignores absent controllers',()=>{
    expect(IndiaJourney.applyAdaptivePixelRatio).toBeTypeOf('function')
    const renderer={setPixelRatio:vi.fn()}
    const resize=vi.fn()
    const mobileController={observe:vi.fn(()=>1.5)}
    IndiaJourney.applyAdaptivePixelRatio(mobileController,.03,renderer,resize)
    expect(mobileController.observe).toHaveBeenCalledWith(30)
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5)
    expect(resize).toHaveBeenCalledOnce()

    const desktopController=null
    IndiaJourney.applyAdaptivePixelRatio(desktopController,.03,renderer,resize)
    expect(renderer.setPixelRatio).toHaveBeenCalledOnce()
    expect(resize).toHaveBeenCalledOnce()
  })

  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
  })
  it('uses hardware budgets independently of screen width',()=>{
    expect(getRendererProfile(1440,3,{quality:'mobile',constrainedDevice:true})).toEqual({
      quality:'mobile',antialias:true,pixelRatio:1.25,
    })
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('mountain')).toEqual([])
    expect(getWorldVisibility('handoff')).toEqual([])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile party, boat, and jeep at readable trailing distances',()=>{
    expect(getMobileTransportCamera('trekker',[2,1,-30])).toEqual({camera:[8,13,-10],target:[2,.8,-32]})
    expect(getMobileTransportCamera('boat',[-2,.25,-86])).toEqual({camera:[2,3.75,-66.2],target:[-2,.75,-86.5]})
    expect(getMobileTransportCamera('jeep',[1,.2,-120])).toEqual({camera:[5,4.2,-95],target:[1,1.1,-121.5]})
  })
  it.each(['mobile','desktop'])(
    'locks every transport to the %s camera frame',
    quality=>{
      for(const transport of ['trekker','boat','jeep']){
        const origin=getTransportCamera(quality,transport,[0,0,0])
        const moved=getTransportCamera(quality,transport,[3,2,-11])
        expect(moved.camera.map((value,index)=>
          Number((value-origin.camera[index]).toFixed(6))
        ))
          .toEqual([3,2,-11])
        expect(moved.target.map((value,index)=>
          Number((value-origin.target[index]).toFixed(6))
        ))
          .toEqual([3,2,-11])
        expect(origin.target[2]).toBeLessThan(0)
        expect(origin.camera[2]).toBeGreaterThan(0)
      }
    },
  )
  it('uses transport-specific subject distances and elevations',()=>{
    const trekker=getTransportCamera('desktop','trekker',[0,0,0])
    const boat=getTransportCamera('desktop','boat',[0,0,0])
    const jeep=getTransportCamera('desktop','jeep',[0,0,0])
    expect(trekker.camera[1]).toBeGreaterThan(jeep.camera[1])
    expect(jeep.camera[1]).toBeGreaterThan(boat.camera[1])
    expect(trekker.camera[2]).toBeGreaterThan(jeep.camera[2])
    expect(jeep.camera[2]).toBeGreaterThan(boat.camera[2])
  })
  it('keeps the mobile boat lower and closer than the trekker and jeep',()=>{
    const subject=new THREE.Vector3(0,0,0)
    const frames=Object.fromEntries(
      ['trekker','boat','jeep'].map(transport=>[
        transport,
        getTransportCamera('mobile',transport,subject.toArray()),
      ]),
    )
    const distance=transport=>new THREE.Vector3(...frames[transport].camera)
      .distanceTo(new THREE.Vector3(...frames[transport].target))
    expect(frames.trekker.camera[1]).toBeGreaterThan(frames.jeep.camera[1])
    expect(frames.jeep.camera[1]).toBeGreaterThan(frames.boat.camera[1])
    expect(distance('trekker')).toBeGreaterThan(distance('boat'))
    expect(distance('jeep')).toBeGreaterThan(distance('boat'))
  })
  it('follows the city coach, holds the mountain stop, then blends into trekker framing',()=>{
    const openingState={
      cameraPosition:[8.5,3.8,46],
      cameraTarget:[-2,1.55,34.8],
      expedition:{activeTransport:'trekker'},
    }
    const transportPosition=[2,3.1,22]
    const frame=progress=>getResolvedCameraFrame({
      quality:'mobile',
      progress,
      state:openingState,
      transportPosition,
    })
    expect(getResolvedCameraFrame({
      quality:'desktop',
      progress:0,
      state:openingState,
      transportPosition,
    })).toEqual(getCityCameraFrame(0,'desktop'))
    expect(frame(0)).toEqual(getCityCameraFrame(0,'mobile'))
    expect(frame(.105)).toEqual({
      camera:[3.5,5.1,67],
      target:[-2.5,1.55,34.8],
    })
    expect(frame(.045)).toEqual(frame(0))
    expect(frame(.14)).toEqual(frame(.105))
    const middle=frame(.165)
    expect(middle.camera[2]).toBeLessThan(frame(.14).camera[2])
    expect(frame(.19)).toEqual(
      getMobileTransportCamera('trekker',transportPosition),
    )
  })
  it.each([
    ['trekker',.2,[3,1,-28]],
    ['boat',.52,[-2,.25,-60]],
    ['jeep',.84,[1,.2,-120]],
  ])('resolves the %s stage around its active subject',(
    activeTransport,
    progress,
    transportPosition,
  )=>{
    const state={
      cameraPosition:[7,6,-19],
      cameraTarget:[2,1,-33],
      expedition:{activeTransport},
    }
    for(const quality of ['mobile','desktop']){
      expect(getResolvedCameraFrame({
        quality,
        progress,
        state,
        transportPosition,
      })).toEqual(getTransportCamera(
        quality,
        state.expedition.activeTransport,
        transportPosition,
      ))
    }
  })
  it.each([
    ['trek-to-boat','trekker','boat',.35],
    ['boat-to-jeep','boat','jeep',.67],
  ])('shares the camera between visible subjects during %s',(
    phase,
    outgoing,
    incoming,
    progress,
  )=>{
    const positions={[outgoing]:[0,1,-30],[incoming]:[8,.3,-36]}
    const weights={[outgoing]:.5,[incoming]:.5}
    const state=getJourneyState(progress)
    expect(state.expedition.phase).toBe(phase)
    for(const quality of ['mobile','desktop']){
      const from=getTransportCamera(quality,outgoing,positions[outgoing])
      const to=getTransportCamera(quality,incoming,positions[incoming])
      const frame=getResolvedCameraFrame({
        quality,
        progress,
        state,
        transportPosition:positions[outgoing],
        transportPositions:positions,
        transportWeights:weights,
      })
      for(const property of ['camera','target']){
        frame[property].forEach((value,index)=>
          expect(value).toBeCloseTo((from[property][index]+to[property][index])/2,6)
        )
      }
    }
  })
  it.each([
    ['mobile',60,390/844],
    ['desktop',48,1440/900],
  ])('keeps production transports centered and fully framed on %s',(
    quality,
    fov,
    aspect,
  )=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const controller=createExpeditionController(scene,materials,quality)
    try{
      for(const progress of [.2,.52,.84]){
        const state=getJourneyState(progress)
        controller.update(state.expedition,0,true)
        const transport=controller.transports[state.expedition.activeTransport]
        const transportPosition=getTransportWorldPosition(
          state.expedition.activeTransport,
          transport,
        ).toArray()
        const frame=getResolvedCameraFrame({
          quality,
          progress,
          state,
          transportPosition,
        })
        const camera=new THREE.PerspectiveCamera(fov,aspect,.1,420)
        camera.position.set(...frame.camera)
        camera.lookAt(...frame.target)
        const projection=getProjectedObjectBounds(transport,camera)
        const horizontalCenter=(
          projection.ndcBounds.min[0]+projection.ndcBounds.max[0]
        )/2
        const verticalCenter=(
          projection.ndcBounds.min[1]+projection.ndcBounds.max[1]
        )/2
        expect(projection).toMatchObject({rendered:true,fullyFramed:true})
        expect(Math.abs(horizontalCenter)).toBeLessThan(.3)
        expect(Math.abs(verticalCenter)).toBeLessThan(.35)
      }
    }finally{
      controller.dispose()
      Object.values(materials).forEach(material=>material.dispose())
    }
  })
  it.each(['mobile','desktop'])(
    'keeps desired and damped production camera handoffs continuous on %s',
    quality=>{
      const scene=new THREE.Scene()
      const materials=createMaterials()
      const controller=createExpeditionController(scene,materials,quality)
      try{
        for(const handoff of [.28,.42,.60,.74]){
          const frames=[handoff-.0001,handoff+.0001].map(progress=>{
            const state=getJourneyState(progress)
            const transition=controller.update(state.expedition,0,true)
            const transport=controller.transports[state.expedition.activeTransport]
            const transportPosition=getTransportWorldPosition(
              state.expedition.activeTransport,
              transport,
            ).toArray()
            const transportPositions=Object.fromEntries(
              Object.entries(controller.transports).map(([name,subject])=>[
                name,
                getTransportWorldPosition(name,subject).toArray(),
              ]),
            )
            return getResolvedCameraFrame({
              quality,
              progress,
              state,
              transportPosition,
              transportPositions,
              transportWeights:transition.transports,
            })
          })
          const previousCamera=new THREE.Vector3(...frames[0].camera)
          const previousTarget=new THREE.Vector3(...frames[0].target)
          const desiredCamera=new THREE.Vector3(...frames[1].camera)
          const desiredTarget=new THREE.Vector3(...frames[1].target)
          expect(previousCamera.distanceTo(desiredCamera)).toBeLessThan(.15)
          expect(previousTarget.distanceTo(desiredTarget)).toBeLessThan(.15)

          const dampedCamera=previousCamera.clone()
          const dampedTarget=previousTarget.clone()
          const damping=getCameraDampingFactor(.5,quality)
          dampCameraVector(dampedCamera,desiredCamera,damping,.78)
          dampCameraVector(dampedTarget,desiredTarget,damping,.78)
          expect(previousCamera.distanceTo(dampedCamera))
            .toBeLessThanOrEqual(.78+1e-12)
          expect(previousTarget.distanceTo(dampedTarget))
            .toBeLessThanOrEqual(.78+1e-12)
        }
      }finally{
        controller.dispose()
        Object.values(materials).forEach(material=>material.dispose())
      }
    },
  )
  it('fully frames the production trekking party at desktop mountain entry',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'desktop')
    const state=getJourneyState(.19)
    const transition=controller.update(state.expedition,0,true)
    const transport=controller.transports.trekker
    const transportPosition=getTransportWorldPosition(
      'trekker',
      transport,
    ).toArray()
    const frame=getResolvedCameraFrame({
      quality:'desktop',
      progress:.19,
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
  it('shows the empty moored boat from both approach cameras before boarding begins',()=>{
    const scene=new THREE.Scene(),materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'desktop')
    try{
      const progress=.26,state=getJourneyState(progress)
      controller.update(state.expedition,0,true)
      for(const [quality,fov,aspect] of [['desktop',48,1440/900],['mobile',60,390/844]]){
        const frame=getResolvedCameraFrame({
          quality,progress,state,
          transportPosition:getTransportWorldPosition('trekker',controller.transports.trekker).toArray(),
        })
        const camera=new THREE.PerspectiveCamera(fov,aspect,.1,420)
        camera.position.set(...frame.camera)
        camera.lookAt(...frame.target)
        const boat=controller.transports.boat
        const hull=getProjectedObjectBounds(boat.getObjectByName('boat-hull'),camera)
        expect(hull.rendered).toBe(true)
        expect(hull.coverage).toBeGreaterThan(.001)
        for(const passenger of boat.userData.members){
          expect(getProjectedObjectBounds(passenger,camera).rendered).toBe(false)
        }
      }
    }finally{
      controller.dispose()
      Object.values(materials).forEach(material=>material.dispose())
    }
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
  it('frames the mobile waterfall and all four boat occupants above the bottom river card',()=>{
    const scene=new THREE.Scene(),materials=createMaterials()
    const controller=createExpeditionController(scene,materials,'mobile')
    try{
      for(const progress of [.44,.53,.62]){
        const state=getJourneyState(progress)
        controller.update(state.expedition,0,true)
        scene.updateMatrixWorld(true)
        const boat=controller.transports.boat
        const frame=getTransportCamera('mobile','boat',getTransportWorldPosition('boat',boat).toArray())
        const camera=new THREE.PerspectiveCamera(60,390/844,.1,420)
        camera.position.set(...frame.camera)
        camera.lookAt(...frame.target)
        camera.updateMatrixWorld(true)
        for(const height of [0,8,16]){
          const fall=new THREE.Vector3(WATERFALL.center[0],height,WATERFALL.center[2]).project(camera)
          expect(Math.abs(fall.x)).toBeLessThan(.9)
          expect(fall.y).toBeGreaterThan(0)
          expect(fall.y).toBeLessThan(.8)
        }
        expect(boat.userData.members).toHaveLength(4)
        boat.userData.members.forEach(member=>{
          const projection=getProjectedObjectBounds(member,camera)
          expect(projection.fullyFramed).toBe(true)
          // At 390×844 the complete 299px card starts at y477.
          const feetY=(1-projection.ndcBounds.min[1])*844/2
          expect(feetY).toBeLessThan(469)
        })
        expect(getProjectedObjectBounds(boat,camera).fullyFramed).toBe(true)
      }
    }finally{
      controller.dispose()
      Object.values(materials).forEach(material=>material.dispose())
    }
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
    expect(atmosphere.exposure).toBeGreaterThan(.85)
    expect(atmosphere.exposure).toBeLessThan(1)
    expect(atmosphere.background).toBeInstanceOf(THREE.Color)
  })
  it('keeps camera convergence tied to wall time when rendering stalls',()=>{
    expect(getCameraDampingFactor(1)).toBeGreaterThan(.85)
    expect(getCameraDampingFactor(1/60)).toBeCloseTo(1-Math.exp(-14/60),8)
    expect(getCameraDampingFactor(1/15,'mobile'))
      .toBeLessThan(getCameraDampingFactor(1/15,'desktop'))
  })
  it.each(['mobile','desktop'])('settles a %s camera promptly after scrolling stops',quality=>{
    for(const fps of [20,60,120]){
      const current=new THREE.Vector3(),target=new THREE.Vector3(0,0,-10)
      for(let frame=0;frame<fps;frame++){
        dampCameraVector(current,target,getCameraDampingFactor(1/fps,quality),getCameraMaximumStep(1/fps))
      }
      expect(current.distanceTo(target)).toBeLessThan(.05)
    }
  })
  it.each(['mobile','desktop'])(
    'keeps %s camera damping consistent across display refresh rates',
    quality=>{
      const positions=[30,60,120].map(fps=>{
        const position=new THREE.Vector3()
        const destination=new THREE.Vector3(1,2,3)
        for(let frame=0;frame<fps;frame++){
          dampCameraVector(position,destination,getCameraDampingFactor(1/fps,quality))
        }
        return position
      })
      positions.slice(1).forEach(position=>
        expect(position.distanceTo(positions[0])).toBeLessThan(1e-10)
      )
    },
  )
  it('limits high-refresh camera motion by elapsed time and bounds stalled frames',()=>{
    const positions=[60,90,120,144].map(fps=>{
      const position=new THREE.Vector3()
      const destination=new THREE.Vector3(1000,0,0)
      for(let frame=0;frame<fps;frame++){
        dampCameraVector(
          position,
          destination,
          getCameraDampingFactor(1/fps),
          getCameraMaximumStep(1/fps),
        )
      }
      return position.x
    })
    positions.forEach(position=>expect(position).toBeCloseTo(46.8,8))
    expect(getCameraMaximumStep(.5)).toBe(.78)
    expect(getCameraMaximumStep(-1)).toBe(0)
    expect(getCameraMaximumStep(NaN)).toBe(0)
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
      expect(getCameraRailJump(progress,.00001)).toBeLessThan(.1)
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
