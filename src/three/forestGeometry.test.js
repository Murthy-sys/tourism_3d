import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { createForestTreeGeometry } from './forestGeometry'

const dispose=tree=>{tree.skeleton.dispose();tree.crown.dispose()}
const triangles=tree=>(tree.skeleton.index.count+tree.crown.index.count)/3

describe('natural broadleaf tree geometry',()=>{
  it('produces repeatable, distinct growth forms with asymmetric branch-tip crowns',()=>{
    const forms=Array.from({length:6},(_,variant)=>createForestTreeGeometry(variant,'desktop'))
    const heights=forms.map(({skeleton,crown})=>Math.max(skeleton.boundingBox.max.y,crown.boundingBox.max.y))
    const centers=forms.map(({crown})=>crown.boundingBox.getCenter(new THREE.Vector3()))
    expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(2)
    expect(new Set(forms.map(({crown})=>crown.userData.clusters)).size).toBeGreaterThan(1)
    expect(centers.every(center=>Math.hypot(center.x,center.z)>.15)).toBe(true)
    expect(forms.every(({skeleton})=>skeleton.boundingBox.min.y<-.08)).toBe(true)
    const repeat=createForestTreeGeometry(3,'desktop')
    expect(repeat.skeleton.attributes.position.array).toEqual(forms[3].skeleton.attributes.position.array)
    expect(repeat.crown.attributes.position.array).toEqual(forms[3].crown.attributes.position.array)
    dispose(repeat)
    forms.forEach(dispose)
  })

  it('has outward-facing bark with finite normals and world-scale vertical texture detail',()=>{
    const tree=createForestTreeGeometry(0,'desktop')
    const {position,normal,uv}=tree.skeleton.attributes
    let outward=0,sampled=0
    for(let index=0;index<position.count;index++){
      const x=position.getX(index),y=position.getY(index),z=position.getZ(index)
      if(y>.5&&y<2){
        if(x*normal.getX(index)+z*normal.getZ(index)>0) outward++
        sampled++
      }
    }
    expect(sampled).toBeGreaterThan(10)
    expect(outward/sampled).toBeGreaterThan(.9)
    expect(normal.array.every(Number.isFinite)).toBe(true)
    expect(Math.max(...Array.from(uv.array).filter((_,index)=>index%2===1))).toBeGreaterThan(4)
    dispose(tree)
  })

  it('keeps photographed leaf UVs intact and foliage attached to the branching crown',()=>{
    const tree=createForestTreeGeometry(4,'desktop')
    const leaves=tree.crown.attributes.position,branches=tree.skeleton.attributes.position
    expect(leaves.count).toBe(tree.crown.userData.leaves*4)
    expect(tree.crown.index.count).toBe(tree.crown.userData.leaves*6)
    expect([...new Set(tree.crown.attributes.uv.array)].sort()).toEqual([0,1])
    expect(tree.crown.attributes.normal.array.every(Number.isFinite)).toBe(true)
    const leaf=new THREE.Vector3(),wood=new THREE.Vector3()
    for(let index=0;index<leaves.count;index+=80){
      leaf.fromBufferAttribute(leaves,index)
      let nearest=Infinity
      for(let vertex=0;vertex<branches.count;vertex++){
        nearest=Math.min(nearest,leaf.distanceTo(wood.fromBufferAttribute(branches,vertex)))
      }
      expect(nearest).toBeLessThan(1.6)
    }
    dispose(tree)
  })

  it('reduces both branches and leaves for mobile and instanced distance meshes',()=>{
    for(let variant=0;variant<6;variant++){
      const desktop=createForestTreeGeometry(variant,'desktop')
      const mobile=createForestTreeGeometry(variant,'mobile')
      const distant=createForestTreeGeometry(variant,'mobile',{distant:true})
      expect(triangles(desktop)).toBeLessThan(4600)
      expect(triangles(mobile)).toBeLessThan(3100)
      expect(triangles(mobile)).toBeLessThan(triangles(desktop)*.7)
      expect(triangles(distant)).toBeLessThan(triangles(mobile)*.6)
      expect(distant.skeleton.attributes.position.count).toBeLessThan(mobile.skeleton.attributes.position.count)
      ;[desktop,mobile,distant].forEach(dispose)
    }
  })
})
