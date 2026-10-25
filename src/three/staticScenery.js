import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const attributeLayout=geometry=>Object.entries(geometry.attributes)
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([name,attribute])=>`${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`)
  .join('|')

/** Batch only explicitly static scenery. Named originals remain available for
 * route clearance/raycast queries; the batches own rendering and shared bounds. */
export function batchStaticScenery(world,roots,{cellSize=32}={}){
  world.updateMatrixWorld(true)
  const inverseWorld=world.matrixWorld.clone().invert()
  const localMatrix=new THREE.Matrix4()
  const position=new THREE.Vector3()
  const cells=new Map()
  const sources=[]
  for(const root of roots.filter(Boolean)){
    root.traverse(object=>{
      // These subtrees have no frame-driven transforms. Avoid recomposing their
      // matrices (including collision proxies) on every scene render.
      object.updateMatrix()
      object.matrixAutoUpdate=false
      if(!object.isMesh||object.isInstancedMesh||!object.visible||object.userData.staticBatchProxy) return
      if(Array.isArray(object.material)||object.material.transparent||object.morphTargetInfluences) return
      const geometry=object.geometry
      if(geometry.drawRange.start!==0||Number.isFinite(geometry.drawRange.count)) return
      localMatrix.multiplyMatrices(inverseWorld,object.matrixWorld)
      position.setFromMatrixPosition(localMatrix)
      const cell=`${Math.floor(position.x/cellSize)}:${Math.floor(position.z/cellSize)}`
      const key=`${cell}:${object.material.id}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${object.layers.mask}:${Boolean(geometry.index)}:${attributeLayout(geometry)}`
      if(!cells.has(key)) cells.set(key,[])
      cells.get(key).push({object,matrix:localMatrix.clone()})
    })
  }
  const batches=new THREE.Group()
  batches.name=`${world.name}-static-batches`
  const addBatch=(batch,entries)=>{
    const source=entries[0].object
    batch.name=`static-scenery-${batches.children.length}`
    batch.castShadow=source.castShadow
    batch.receiveShadow=source.receiveShadow
    batch.renderOrder=source.renderOrder
    batch.layers.mask=source.layers.mask
    batch.matrixAutoUpdate=false
    // Queries continue to use the named, exact source meshes. Do not return a
    // duplicate intersection for the rendering representation.
    batch.raycast=()=>{}
    batch.userData.staticScenery=true
    batch.userData.sourceCount=entries.length
    if(batch.isInstancedMesh){
      batch.computeBoundingBox()
      batch.computeBoundingSphere()
    }else{
      batch.geometry.computeBoundingBox()
      batch.geometry.computeBoundingSphere()
    }
    batches.add(batch)
    for(const {object} of entries){
      object.visible=false
      object.userData.staticBatchProxy=true
      sources.push(object)
    }
  }
  for(const entries of cells.values()){
    const repeated=new Map()
    for(const entry of entries){
      const geometry=entry.object.geometry
      if(!repeated.has(geometry)) repeated.set(geometry,[])
      repeated.get(geometry).push(entry)
    }
    const unique=[]
    for(const [geometry,instances] of repeated){
      if(instances.length<3){unique.push(...instances);continue}
      const batch=new THREE.InstancedMesh(geometry,instances[0].object.material,instances.length)
      instances.forEach(({matrix},index)=>batch.setMatrixAt(index,matrix))
      addBatch(batch,instances)
    }
    if(unique.length<2) continue
    const geometries=unique.map(({object,matrix})=>object.geometry.clone().applyMatrix4(matrix))
    const merged=mergeGeometries(geometries,false)
    geometries.forEach(geometry=>geometry.dispose())
    if(merged) addBatch(new THREE.Mesh(merged,unique[0].object.material),unique)
  }
  world.add(batches)
  const result={sources:sources.length,batches:batches.children.length,savedDraws:sources.length-batches.children.length}
  batches.userData.batching=result
  return result
}
