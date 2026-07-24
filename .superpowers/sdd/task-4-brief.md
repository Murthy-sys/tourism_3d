### Task 4: Dense forest finale and boat-to-jeep landing

**Files:**
- Modify: `src/three/jungleWorld.js`
- Modify: `src/three/jungleWorld.test.js`

**Interfaces:**
- Consumes `LANDMARKS.forestLanding` and `LANDMARKS.forestEnd`.
- Preserves `createJungleWorld(materials, quality)` and `world.userData.route`.
- Adds `forest-inlet`, `forest-water-landing`, `forest-near-layer`, `forest-mid-layer`, `forest-far-layer`, `jungle-undergrowth`, `jungle-vines`, and `jungle-mist`.

- [ ] **Step 1: Write failing forest-density and clearance tests**

```js
it('creates layered dense forest around a clear jeep route',()=>{
  const world=createJungleWorld(createMaterials(),'desktop')
  ;['forest-inlet','forest-water-landing','forest-near-layer','forest-mid-layer','forest-far-layer','jungle-undergrowth','jungle-vines','jungle-mist']
    .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
  expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(180)
  expect(world.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
  expect(world.userData.routeClearance).toBeGreaterThanOrEqual(1.4)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/jungleWorld.test.js`

Expected: FAIL because layered groups, density counters, and shared inlet alignment are absent.

- [ ] **Step 3: Build the inlet and physical handoff**

Create wet banks, reeds, roots, puddles, stones, overhanging branches, and a timber landing around `LANDMARKS.forestLanding`. Start the jeep curve at the landing and end at `LANDMARKS.forestEnd`. Keep all trunks, rocks, and fallen timber at least 1.4 units from sampled route points.

- [ ] **Step 4: Build dense near/mid/far forest**

Use deterministic hashed placement rather than rows. Create at least six crown silhouettes, tapered trunks, branch forks, vines, ferns, shrubs, grass, fallen logs, roots, damp soil, puddles, low mist, and sparse sun shafts. Desktop minimums are 90 trees and 180 undergrowth objects; mobile minimums are 55 and 110. Preserve canopy silhouette and transition landmarks before reducing secondary instances.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js`

Expected: forest and jeep tests pass.

```bash
git add src/three/jungleWorld.js src/three/jungleWorld.test.js
git commit -m "Build dense forest expedition finale"
```

