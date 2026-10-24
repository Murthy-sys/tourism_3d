import * as THREE from 'three'
import { syncExpeditionPerson } from './realisticTravellers'
import { createContactShadow } from './expeditionPeople'
import { getFinaleGroundHeight,WATERFALL,WATERFALL_VIEWING_POSITIONS } from './finaleConfig'
import { smootherstep } from './terrain'

const DEPARTURE_DELAYS=[0,.07,.14,.21]
const DEPARTURE_DURATION=.79
const STANDING_HIP_LIFT=.835
const JEEP_SIDE_CLEARANCE=1.9
const JEEP_END_CLEARANCE=2.8
const clamp=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0))
const headingBlend=(from,to,weight)=>
  from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*weight

const capturePose=member=>{
  const {torso,head,arms,legs,elbows,knees}=member.userData
  const lifted=[torso,head,member.getObjectByName('neck'),member.getObjectByName('trousers'),...arms,...legs]
  return{
    lifted:lifted.map(object=>({object,y:object.position.y})),
    armX:arms.map(arm=>arm.rotation.x),elbowX:elbows.map(elbow=>elbow.rotation.x),
    rotations:[torso,head,...arms,...legs,...elbows,...knees].map(object=>({object,rotation:object.rotation.clone()})),
  }
}

const restorePose=record=>{
  record.pose.lifted.forEach(({object,y})=>{object.position.y=y})
  record.pose.rotations.forEach(({object,rotation})=>object.rotation.copy(rotation))
  record.member.userData.seated=true
}

const applyPose=(record,standing,walkProgress,reducedMotion)=>{
  const {member,pose}=record
  const {torso,head,arms,legs,elbows,knees}=member.userData
  pose.lifted.forEach(({object,y})=>{object.position.y=y+STANDING_HIP_LIFT*standing})
  const walkingEnvelope=smootherstep(0,.12,walkProgress)*(1-smootherstep(.83,1,walkProgress))
  const swing=reducedMotion?0:Math.sin(walkProgress*record.pathLength*5.8)*.4*walkingEnvelope
  const leadingLeg=smootherstep(0,.78,standing)
  const trailingLeg=smootherstep(.16,1,standing)
  arms[0].rotation.x=THREE.MathUtils.lerp(pose.armX[0],swing*.68,standing)
  arms[1].rotation.x=THREE.MathUtils.lerp(pose.armX[1],-swing*.68,standing)
  legs[0].rotation.x=THREE.MathUtils.lerp(-1.48,-swing,leadingLeg)
  legs[1].rotation.x=THREE.MathUtils.lerp(-1.48,swing,trailingLeg)
  knees[0].rotation.x=THREE.MathUtils.lerp(1.48,.035+Math.max(0,swing)*.58,leadingLeg)
  knees[1].rotation.x=THREE.MathUtils.lerp(1.48,.035+Math.max(0,-swing)*.58,trailingLeg)
  elbows[0].rotation.x=THREE.MathUtils.lerp(pose.elbowX[0],-.16-Math.max(0,-swing)*.2,standing)
  elbows[1].rotation.x=THREE.MathUtils.lerp(pose.elbowX[1],-.16-Math.max(0,swing)*.2,standing)
  torso.rotation.x=-.09*Math.sin(standing*Math.PI)
  torso.rotation.z=reducedMotion?0:swing*.018
  head.rotation.x=0
  member.userData.seated=standing<1
}

export function createWaterfallTravellers(jeep){
  const group=new THREE.Group()
  group.name='waterfall-travellers'
  group.visible=false
  const members=[...jeep.userData.members]
  group.userData.members=members
  const records=members.map((member,index)=>{
    const shadow=createContactShadow(.72,.86,.2)
    shadow.name=`waterfall-traveller-shadow-${index}`
    shadow.visible=false
    group.add(shadow)
    member.updateMatrix()
    return{
      member,index,shadow,parent:member.parent,
      position:member.position.clone(),quaternion:member.quaternion.clone(),scale:member.scale.clone(),
      localMatrix:member.matrix.clone(),pose:capturePose(member),side:Math.sign(member.position.x)||1,
      seat:new THREE.Vector3(),exit:new THREE.Vector3(),view:new THREE.Vector3(...WATERFALL_VIEWING_POSITIONS[index]),
      seatQuaternion:new THREE.Quaternion(),seatScale:new THREE.Vector3(),seatMatrix:new THREE.Matrix4(),
      forward:new THREE.Vector3(),soles:member.userData.legs.map(leg=>leg.userData.sole),
      path:null,pathLength:0,stage:'seated',localProgress:0,
    }
  })
  const bodyBounds=new THREE.Box3()
  const footBounds=new THREE.Box3()
  const worldPosition=new THREE.Vector3()
  const worldQuaternion=new THREE.Quaternion()
  const inverseGroupRotation=new THREE.Quaternion()
  const routePoint=new THREE.Vector3()
  const routeTangent=new THREE.Vector3()
  const worldUp=new THREE.Vector3(0,1,0)

  const placeMember=(record,position,heading)=>{
    record.member.position.copy(position)
    group.worldToLocal(record.member.position)
    worldQuaternion.setFromAxisAngle(worldUp,heading)
    record.member.quaternion.copy(inverseGroupRotation).multiply(worldQuaternion)
    syncExpeditionPerson(record.member)
    record.member.updateWorldMatrix(true,true)
  }

  const groundedRootY=(record,groundHeight)=>{
    bodyBounds.makeEmpty()
    record.soles.forEach(sole=>bodyBounds.union(footBounds.setFromObject(sole)))
    record.member.getWorldPosition(worldPosition)
    return worldPosition.y+groundHeight-bodyBounds.min.y
  }

  const restoreSeat=record=>{
    if(record.member.parent!==record.parent) record.parent.add(record.member)
    record.member.position.copy(record.position)
    record.member.quaternion.copy(record.quaternion)
    record.member.scale.copy(record.scale)
    record.member.visible=true
    restorePose(record)
    syncExpeditionPerson(record.member)
    record.shadow.visible=false
    record.path=null
    record.pathLength=0
    record.stage='seated'
  }

  const beginDeparture=record=>{
    record.seatMatrix.multiplyMatrices(record.parent.matrixWorld,record.localMatrix)
    record.seatMatrix.decompose(record.seat,record.seatQuaternion,record.seatScale)
    record.exit.set(record.side*1.57,0,record.position.z)
    jeep.localToWorld(record.exit)
    record.exit.y=getFinaleGroundHeight(record.exit.x,record.exit.z)
    const outward=new THREE.Vector3(record.side,0,0).transformDirection(jeep.matrixWorld)
    const localView=jeep.worldToLocal(record.view.clone())
    const bypassX=record.side*JEEP_SIDE_CLEARANCE
    const bypassZ=(localView.z<0?-1:1)*JEEP_END_CLEARANCE
    // Keep clearance relative to the parked body, including an unfinished turn.
    // Cross to the other side only after passing the front or rear bumper.
    const clearancePoints=[
      new THREE.Vector3(bypassX,0,THREE.MathUtils.lerp(record.position.z,bypassZ,.5)),
      new THREE.Vector3(bypassX,0,bypassZ),
    ]
    if(Math.abs(localView.z)<JEEP_END_CLEARANCE){
      clearancePoints.push(new THREE.Vector3(localView.x,0,bypassZ))
    }
    const worldPoints=clearancePoints.map(point=>{
      jeep.localToWorld(point)
      point.y=getFinaleGroundHeight(point.x,point.z)
      return point
    })
    record.path=new THREE.CatmullRomCurve3(
      [record.exit.clone(),...worldPoints,record.view.clone()],false,'centripetal',
    )
    record.pathLength=record.path.getLength()
    record.seatHeading=Math.atan2(
      record.forward.set(0,0,1).applyQuaternion(record.seatQuaternion).x,
      record.forward.z,
    )
    record.exitHeading=Math.atan2(outward.x,outward.z)
    group.attach(record.member)
  }

  const update=(progress,_elapsed=0,reducedMotion=false)=>{
    const value=clamp(progress)
    jeep.updateWorldMatrix(true,true)
    group.updateWorldMatrix(true,true)
    group.getWorldQuaternion(inverseGroupRotation).invert()
    records.forEach(record=>{
      const local=clamp((value-DEPARTURE_DELAYS[record.index])/DEPARTURE_DURATION)
      record.localProgress=local
      if(local===0){
        restoreSeat(record)
        return
      }
      if(!record.path) beginDeparture(record)
      record.member.visible=true
      const standing=smootherstep(.32,.48,local)
      const walkProgress=smootherstep(.48,.91,local)
      applyPose(record,standing,walkProgress,reducedMotion)
      if(local<.48){
        const sliding=smootherstep(.12,.32,local)
        routePoint.lerpVectors(record.seat,record.exit,sliding)
        routePoint.y=record.seat.y+Math.sin(sliding*Math.PI)*.07
        const heading=headingBlend(record.seatHeading,record.exitHeading,smootherstep(0,.14,local))
        placeMember(record,routePoint,heading)
        const ground=getFinaleGroundHeight(routePoint.x,routePoint.z)
        routePoint.y=THREE.MathUtils.lerp(routePoint.y,groundedRootY(record,ground),standing)
        placeMember(record,routePoint,heading)
        record.stage=local<.12?'turning':local<.32?'exiting':'stepping'
      }else{
        record.path.getPointAt(walkProgress,routePoint)
        record.path.getTangentAt(Math.min(.9999,walkProgress),routeTangent)
        const walkHeading=Math.atan2(routeTangent.x,routeTangent.z)
        const watchingHeading=Math.atan2(WATERFALL.center[0]-record.view.x,WATERFALL.center[2]-record.view.z)
        const heading=headingBlend(
          headingBlend(record.exitHeading,walkHeading,smootherstep(0,.15,walkProgress)),
          watchingHeading,
          smootherstep(.91,1,local),
        )
        placeMember(record,routePoint,heading)
        const ground=getFinaleGroundHeight(routePoint.x,routePoint.z)
        routePoint.y=groundedRootY(record,ground)
        placeMember(record,routePoint,heading)
        record.member.userData.head.rotation.x=-.12*smootherstep(.91,1,local)
        record.stage=local<.91?'walking':'watching'
      }
      const ground=getFinaleGroundHeight(routePoint.x,routePoint.z)
      record.shadow.visible=local>=.48
      record.shadow.position.set(routePoint.x,ground+.012,routePoint.z)
      group.worldToLocal(record.shadow.position)
    })
    jeep.userData.doors?.forEach(({object,side})=>{
      const departure=Math.max(...records.filter(record=>record.side===side).map(record=>record.localProgress))
      object.rotation.y=side*1.5*smootherstep(0,.14,departure)
    })
    group.visible=value>0
    group.userData.stages=records.map(record=>record.stage)
    group.userData.progress=value
    return{members,stages:group.userData.stages,seatedCount:records.filter(record=>record.stage==='seated').length}
  }

  return{group,members,update,reset:()=>update(0)}
}
