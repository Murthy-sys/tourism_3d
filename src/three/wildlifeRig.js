import * as THREE from 'three'

const anatomy={
  deer:{scale:1.3,centerZ:-.24,hipY:.79,kneeY:.40,legTop:.79,legFull:.56,
    headY:[.93,1.16],headZ:[.40,.66],headPivot:[0,.96,.52],stride:.042,lift:.014,
    stepDistance:.50,stepLift:.065},
  boar:{scale:.35,centerZ:1.79,hipY:.56,kneeY:.25,legTop:.53,legFull:.29,
    headY:[.29,.50],headZ:[.27,.57],headPivot:[0,.58,.28],stride:.033,lift:.010,
    stepDistance:.38,stepLift:.045},
}
const smooth=(value,min,max)=>THREE.MathUtils.smoothstep(value,min,max)
const strideOffsets=[0,Math.PI,Math.PI*.65,Math.PI*1.65]
const walkOffsets=[0,.5,.75,.25]
const stanceFraction=.68

/** Skin the original textured surface without rebuilding its anatomy or UVs.
 * Feet are in group-local space, ordered front-left, front-right, rear-left,
 * rear-right. groundFeet receives ground elevations in that same local space.
 * Vertex deformation stays on the GPU; only four contact points run on CPU. */
export function createWildlifeRig(source,kind){
  const spec=anatomy[kind]
  if(!spec) throw new Error(`Unsupported wildlife rig: ${kind}`)
  source.updateMatrixWorld(true)
  let original
  source.traverse(object=>{if(object.isMesh&&!original)original=object})
  if(!original) throw new Error(`The ${kind} asset contains no mesh`)

  const geometry=original.geometry.clone().applyMatrix4(original.matrixWorld)
  geometry.userData={...geometry.userData}
  delete geometry.userData.managedByWildlifeTemplate
  geometry.computeBoundingBox()
  geometry.translate(0,-geometry.boundingBox.min.y,-spec.centerZ)
  geometry.scale(spec.scale,spec.scale,spec.scale)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  const positions=geometry.getAttribute('position')
  const contacts=Array.from({length:4},()=>({minY:Infinity,point:new THREE.Vector3(),count:0}))
  const legFor=(x,z)=>(z>=(kind==='boar'?-.18:0)?0:2)+(x<0?0:1)
  for(let index=0;index<positions.count;index++){
    const contact=contacts[legFor(positions.getX(index),positions.getZ(index))]
    contact.minY=Math.min(contact.minY,positions.getY(index))
  }
  // Average the sole surface, rather than the extremity of one split hoof.
  for(let index=0;index<positions.count;index++){
    const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index)
    const contact=contacts[legFor(x,z)]
    if(y<contact.minY+.012){contact.point.x+=x;contact.point.z+=z;contact.count++}
  }
  const restFeet=contacts.map(contact=>contact.point.set(
    contact.point.x/contact.count,contact.minY,contact.point.z/contact.count))
  const group=new THREE.Group()
  group.name=`${kind}-anatomical-rig`
  group.userData={...source.userData}
  const mesh=new THREE.SkinnedMesh(geometry,original.material)
  mesh.name=original.name||`${kind}-textured-surface`
  mesh.castShadow=true
  mesh.receiveShadow=true
  // Four actors with low vertex counts are cheaper and safer than recomputing
  // animated surface bounds every frame for frustum culling.
  mesh.frustumCulled=false
  group.add(mesh)
  const body=new THREE.Bone(),head=new THREE.Bone()
  body.name='body';head.name='head'
  head.position.fromArray(spec.headPivot)
  body.add(head)
  mesh.add(body)
  const bones=[body,head]
  const legs=restFeet.map((foot,index)=>{
    const upper=new THREE.Bone(),lower=new THREE.Bone()
    upper.name=`leg-${index}-upper`;lower.name=`leg-${index}-lower`
    const hipZ=foot.z+(kind==='deer'?(index<2?-.10:.11):(index<2?-.19:-.31))
    upper.position.set(foot.x,spec.hipY,hipZ)
    const knee=new THREE.Vector3(foot.x,spec.kneeY,THREE.MathUtils.lerp(hipZ,foot.z,.6))
    lower.position.copy(knee).sub(upper.position)
    upper.add(lower);body.add(upper)
    bones.push(upper,lower)
    return{upper,lower,restLower:lower.position.clone(),sole:foot.clone().sub(knee),lift:0}
  })
  const skinIndices=new Uint16Array(positions.count*4)
  const skinWeights=new Float32Array(positions.count*4)
  for(let index=0;index<positions.count;index++){
    const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index)
    const leg=legFor(x,z),upperIndex=2+leg*2,lowerIndex=upperIndex+1
    const headWeight=smooth(y,...spec.headY)*smooth(z,...spec.headZ)
    const legWeight=(1-smooth(y,spec.legFull,spec.legTop))*(1-headWeight)
    const lowerWeight=1-smooth(y,spec.kneeY-.10,spec.kneeY+.10)
    skinIndices.set([0,1,upperIndex,lowerIndex],index*4)
    skinWeights.set([1-headWeight-legWeight,headWeight,legWeight*(1-lowerWeight),legWeight*lowerWeight],index*4)
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4))
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4))
  const skeleton=new THREE.Skeleton(bones)
  mesh.bind(skeleton)
  const feet=restFeet.map(point=>point.clone())
  const inverseGroup=new THREE.Matrix4(),contactMatrix=new THREE.Matrix4(),correction=new THREE.Vector3()
  const inverseRotation=new THREE.Quaternion()
  const refreshFeet=()=>{
    group.updateWorldMatrix(true,true)
    inverseGroup.copy(group.matrixWorld).invert()
    legs.forEach((leg,index)=>{
      contactMatrix.multiplyMatrices(inverseGroup,leg.lower.matrixWorld)
      feet[index].copy(leg.sole).applyMatrix4(contactMatrix)
    })
    skeleton.update()
  }
  const pose=(elapsed=0,reducedMotion=false,motion)=>{
    const time=reducedMotion?0:elapsed
    const walking=motion!==undefined&&!reducedMotion&&Number.isFinite(motion.distance)
    const weight=walking?smooth(Math.abs(motion.speed||0),.005,.07):0
    const distance=walking?motion.distance:0
    const cycle=distance/spec.stepDistance
    body.position.y=weight*Math.sin(cycle*Math.PI*4)*.006
    head.rotation.set(reducedMotion?0:Math.sin(time*.31)*.020+weight*Math.sin(cycle*Math.PI*2)*.018,
      reducedMotion?0:Math.sin(time*.23)*.035,0)
    legs.forEach((leg,index)=>{
      leg.lower.position.copy(leg.restLower)
      if(motion!==undefined){
        const phase=THREE.MathUtils.euclideanModulo(cycle+walkOffsets[index],1)
        const reach=spec.stepDistance*stanceFraction*.5
        let offset
        if(phase<stanceFraction){
          // A planted hoof moves backward in body space at exactly the body's
          // forward speed. Its world contact therefore stays still on a stride.
          offset=reach-phase*spec.stepDistance
          leg.lift=0
        }else{
          const swing=(phase-stanceFraction)/(1-stanceFraction)
          const blend=swing*swing*(3-2*swing)
          // Hermite endpoint velocities match the stance, avoiding a snap at
          // liftoff/landing while each leg returns independently through air.
          const velocity=-spec.stepDistance*(1-stanceFraction)
          offset=THREE.MathUtils.lerp(-reach,reach,blend)+velocity*swing*(1-swing)*(1-2*swing)
          leg.lift=Math.sin(swing*Math.PI)**2*spec.stepLift*weight
        }
        offset*=weight
        leg.upper.rotation.x=-Math.atan2(offset,spec.hipY)*.9
        leg.lower.rotation.x=-leg.upper.rotation.x+leg.lift*1.5
        leg.targetZ=restFeet[index].z+offset
        return
      }
      const phase=time*.82+strideOffsets[index]
      const swing=reducedMotion?0:Math.sin(phase)
      leg.upper.rotation.x=swing*spec.stride
      leg.lower.rotation.x=-swing*spec.stride*.65
      leg.lift=reducedMotion?0:Math.pow(Math.max(0,Math.sin(phase)),2)*spec.lift
    })
    refreshFeet()
    if(motion!==undefined){
      legs.forEach((leg,index)=>{
        correction.set(0,restFeet[index].y+leg.lift-feet[index].y,leg.targetZ-feet[index].z)
        inverseRotation.copy(leg.upper.quaternion).invert()
        leg.lower.position.add(correction.applyQuaternion(inverseRotation))
      })
      refreshFeet()
    }
  }
  const groundFeet=localGroundY=>{
    // Ground correction is a short smooth extension through the knee blend.
    // Transform the vertical correction through the upper-leg rotation so a
    // slope never moves a hoof sideways or changes the animal's world heading.
    legs.forEach((leg,index)=>{
      correction.set(0,localGroundY[index]+leg.lift-feet[index].y,0)
      inverseRotation.copy(leg.upper.quaternion).invert()
      leg.lower.position.add(correction.applyQuaternion(inverseRotation))
    })
    refreshFeet()
  }
  const releaseSource=source.userData.disposeRealisticWildlife
  let disposed=false
  group.userData.disposeRealisticWildlife=()=>{
    if(disposed)return
    disposed=true
    skeleton.dispose()
    releaseSource?.()
  }
  pose(0,true)
  return{group,pose,feet,restFeet,groundFeet,maximumLift:spec.stepLift}
}
