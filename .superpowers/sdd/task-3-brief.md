### Task 3: Guide-led trekking party

**Files:**
- Create: `src/three/trekkingParty.js`
- Create: `src/three/trekkingParty.test.js`

**Interfaces:**
- Produces: `createTrekkingParty(materials): THREE.Group`.
- Produces: `updateTrekkingParty(party, curve, progress, elapsed, reducedMotion, heightAt): void`.
- Party `userData.members` is an array of four entries `{role, phase, root, limbs, pole}`.

- [ ] **Step 1: Write failing party tests**

```js
it('creates one guide and three visually varied tourists',()=>{
  const party=createTrekkingParty(createMaterials())
  expect(party.userData.members).toHaveLength(4)
  expect(party.userData.members.filter(m=>m.role==='guide')).toHaveLength(1)
  expect(party.userData.members.filter(m=>m.role==='tourist')).toHaveLength(3)
  expect(new Set(party.userData.members.map(m=>m.phase)).size).toBe(4)
  expect(party.getObjectByName('guide-backpack')).toBeTruthy()
})

it('keeps every member separated and planted on terrain',()=>{
  updateTrekkingParty(party,curve,.65,2,false,(x,z)=>x*.03-z*.01)
  const positions=party.userData.members.map(m=>m.root.position.clone())
  positions.forEach(p=>expect(p.y).toBeCloseTo(p.x*.03-p.z*.01,.2))
  for(let i=1;i<positions.length;i++)expect(positions[i].distanceTo(positions[i-1])).toBeGreaterThan(.45)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/trekkingParty.test.js`

Expected: FAIL because `trekkingParty.js` does not exist.

- [ ] **Step 3: Build four detailed articulated members**

Extract the current trekker body construction into a reusable member factory. Increase sphere/capsule segments, add layered shirt/jacket meshes, trousers, boots with soles, hair, straps, pack body, roll mat, and pole. Give the guide a deep green jacket and ochre pack; give tourists yellow/navy, rust/charcoal, and teal/tan palettes. Use phases `[0,1.37,2.91,4.42]` and spacing offsets `[0,.055,.11,.165]`.

- [ ] **Step 4: Implement route spacing and ground contact**

For each member, sample `curve.getPointAt(clamp(progress-offset))`, replace Y with `heightAt(x,z)`, face the route tangent, and animate opposite limbs from `sin(elapsed*5.2+phase)`. Compute pole Y correction from the terrain height at its world X/Z. Reduced motion sets swing to zero but retains spacing and route travel.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/trekkingParty.test.js src/three/expeditionVehicles.test.js`

Expected: party tests and existing vehicle tests pass.

```bash
git add src/three/trekkingParty.js src/three/trekkingParty.test.js
git commit -m "Add guide-led trekking party"
```

