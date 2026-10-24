import * as THREE from 'three'
import { describe,it,expect } from 'vitest'
import { createExpeditionController } from './expeditionController'
import { getJourneyState } from './journeyData'
import { createMaterials } from './primitives'
import { getJourneyQASnapshot,getProjectedObjectBounds,getResolvedCameraFrame } from './indiaJourney'

describe('forest to waterfall continuity',()=>{
  it.each([
    ['desktop',1440/900,48],['mobile',390/844,60],
  ])('keeps the same four travellers framed and reversibly seated on %s', (quality,aspect,fov)=>{
    const scene=new THREE.Scene(),materials=createMaterials()
    const controller=createExpeditionController(scene,materials,quality)
    const jeep=controller.transports.jeep
    const identities=[...jeep.userData.members]
    const originalParents=identities.map(member=>member.parent)
    const originalSeats=identities.map(member=>member.position.clone())
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,420)
    for(const progress of [.9,.93,.95,.97,1]){
      const state=getJourneyState(progress)
      const transition=controller.update(state.expedition,4,true)
      const frame=getResolvedCameraFrame({quality,progress,state,transportPosition:jeep.position.toArray()})
      camera.position.set(...frame.camera)
      camera.lookAt(...frame.target)
      camera.updateMatrixWorld(true)
      scene.updateMatrixWorld(true)
      const snapshot=getJourneyQASnapshot({state,transition,transports:controller.transports,scenery:controller.scenery,camera,cameraJump:0,renderedWorlds:{mountain:false,water:false,forest:true}})
      expect(jeep.userData.members).toEqual(identities)
      expect(snapshot.visibleMembers).toEqual({guides:1,tourists:3})
      identities.forEach(member=>expect(getProjectedObjectBounds(member,camera).fullyFramed).toBe(true))
      expect(jeep.position.z).toBe(-132)
      if(progress>=.97){
        expect(controller.finale.group.userData.stages).toEqual(['watching','watching','watching','watching'])
        const waterfall=controller.scenery.waterfall.getObjectByName('waterfall-cascade-1')
        // The upper river continues into the full-screen hillside. Frame the
        // falling face itself, rather than the upstream river's enclosing box.
        const positions=waterfall.geometry.attributes.position
        const uv=waterfall.geometry.attributes.uv
        for(let i=0;i<positions.count;i++){
          if(uv.getY(i)>.94) continue
          const point=new THREE.Vector3().fromBufferAttribute(positions,i)
            .applyMatrix4(waterfall.matrixWorld).project(camera)
          expect(Math.abs(point.x)).toBeLessThan(.98)
          expect(Math.abs(point.y)).toBeLessThan(.98)
          expect(point.z).toBeLessThan(1)
        }
      }
    }
    controller.update(getJourneyState(.82).expedition,8,true)
    identities.forEach((member,index)=>{
      expect(member.parent).toBe(originalParents[index])
      expect(member.position.equals(originalSeats[index])).toBe(true)
    })
    expect(controller.finale.group.visible).toBe(false)
    controller.dispose()
    Object.values(materials).forEach(material=>material.dispose())
    expect(scene.children).toHaveLength(0)
  })
})
