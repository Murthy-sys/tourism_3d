### Task 2: Lush realistic hill-country world

**Files:**
- Create: `src/three/hillWorld.js`
- Create: `src/three/hillWorld.test.js`
- Delete after migration: `src/three/iceWorld.js`
- Delete after migration: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes: `sampleHillHeight`, `sampleHillSlope`, `createTerrainGeometry`.
- Produces: `createHillWorld(materials, quality): THREE.Group`.
- Produces: `updateHillWorld(world, elapsed): void`.
- Hill `userData` contains `route`, `heightAt`, `mist`, `landing`, and `copyAnchor`.

- [ ] **Step 1: Write failing hill-world test**

```js
it('creates lush non-conical hill country without ice assets',()=>{
  const world=createHillWorld(createMaterials(),'desktop')
  ;['hill-terrain','hill-ridges','hill-forest','hill-rock-faces','hill-mist','hill-trail','hill-landing','hill-lodge'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  ;['glacier','drifting-snow','ice-foreground','ice-midground','ice-background'].forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
  expect(world.userData.route.getPoints(20).every(p=>Math.abs(p.y-world.userData.heightAt(p.x,p.z))<.25)).toBe(true)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/hillWorld.test.js`

Expected: FAIL because `createHillWorld` is unavailable.

- [ ] **Step 3: Build terrain and material layers**

Create a 64×72 world with at least 96×108 desktop segments and 56×72 mobile segments. Apply vertex colors by slope: grass `#496b35` below slope `.8`, earth `#66513a` between `.8–1.45`, and exposed rock `#59605b` above `1.45`. Use a vertex-color `MeshStandardMaterial` with roughness `.92` and `flatShading:false`.

- [ ] **Step 4: Add irregular ridges and depth layers**

Build three displaced terrain ribbons at increasing negative Z offsets rather than cone meshes. Reduce saturation and opacity for distant layers. Add deterministic rock outcrops on steep samples and clustered broadleaf/pine-like hill trees only where slope is below `1.1`.

- [ ] **Step 5: Add route, landing, mist, and lodge**

Sample 30 trail control points from Z `16` to `-30`, set Y to terrain height plus `.08`, and construct a narrow earth ribbon that follows the points. Add a timber-and-stone landing at the low trail start and a wood/stone lodge at the final contact anchor. Add eight translucent mist volumes in valleys; animate only their slow horizontal drift.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/hillWorld.test.js src/three/terrain.test.js`

Expected: all terrain and hill tests pass.

```bash
git add src/three/hillWorld.js src/three/hillWorld.test.js src/three/terrain.js
git commit -m "Build realistic lush hill country"
```

