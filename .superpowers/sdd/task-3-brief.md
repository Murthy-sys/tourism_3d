### Task 3: Reflective water corridor and mountain-to-boat landing

**Files:**
- Modify: `src/three/waterWorld.js`
- Modify: `src/three/waterWorld.test.js`
- Modify: `src/three/expeditionVehicles.js`
- Modify: `src/three/expeditionVehicles.test.js`

**Interfaces:**
- Consumes `LANDMARKS.mountainLanding` and `LANDMARKS.forestLanding`.
- Preserves `createWaterWorld`, `updateWaterWorld`, `createExpeditionBoat`, and `updateBoat`.
- Water `userData` exposes `route`, `mountainLanding`, `forestLanding`, `surfaceMaterials`, and `forestSightline`.

- [ ] **Step 1: Write failing realistic-water tests**

```js
it('creates a shaped reflective corridor with two aligned landings',()=>{
  const water=createWaterWorld(createMaterials(),'desktop')
  ;['water-depth-layer','water-reflection-layer','water-shallows','curved-river-banks','mountain-water-landing','forest-water-landing','distant-forest-silhouette']
    .forEach(name=>expect(water.getObjectByName(name)).toBeTruthy())
  expect(water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(2)
  expect(water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
  expect(water.userData.surfaceMaterials.every(material=>material.roughness<.45)).toBe(true)
})

it('keeps the articulated boat and visible wake',()=>{
  const boat=createExpeditionBoat(createMaterials())
  expect(boat.getObjectByName('boat-rower')).toBeTruthy()
  expect(boat.getObjectByName('boat-oar-left')).toBeTruthy()
  expect(boat.getObjectByName('boat-oar-right')).toBeTruthy()
  expect(boat.getObjectByName('boat-wake')).toBeTruthy()
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: FAIL because the depth/reflection/shoreline groups and shared landing alignment are absent.

- [ ] **Step 3: Build a believable water body**

Replace the flat rectangular presentation with a curved 50-unit corridor. Use a dark depth mesh beneath a translucent `MeshPhysicalMaterial` surface with `roughness:.18`, `metalness:.05`, `transmission:.12`, `clearcoat:1`, and depth-based blue-green vertex colors. Add a second reflection mesh, independently animated wave vertices, pale shallows, wet stones, foam accents, reeds, bank shadows, and curved irregular bank meshes.

- [ ] **Step 4: Align the route, wake, and distant forest**

Construct the boat curve from the two shared landmarks with gentle lateral bends. Orient landings to route tangents. Add multiple overlapping dark-green canopy silhouette bands at the forest end so the forest is readable from mid-water. Update the wake behind the boat from its route tangent and animate oars, ripples, reflection layer, and surface layer at different frequencies.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: water and boat tests pass.

```bash
git add src/three/waterWorld.js src/three/waterWorld.test.js src/three/expeditionVehicles.js src/three/expeditionVehicles.test.js
git commit -m "Build realistic reflective water corridor"
```

