### Task 2: Natural mountain opening and guide-led trekking party

**Files:**
- Create: `src/three/hillWorld.js`
- Create: `src/three/hillWorld.test.js`
- Create: `src/three/trekkingParty.js`
- Create: `src/three/trekkingParty.test.js`

**Interfaces:**
- Consumes `LANDMARKS`, `sampleMountainHeight`, `sampleMountainSlope`, and `createTerrainGeometry`.
- Produces `createHillWorld(materials, quality): THREE.Group`.
- Produces `updateHillWorld(world, elapsed): void`.
- Produces `createTrekkingParty(materials): THREE.Group`.
- Produces `updateTrekkingParty(party, curve, progress, elapsed, reducedMotion, heightAt): void`.
- Hill `userData` exposes `route`, `heightAt`, `landing`, and `distantWaterAnchor`.

- [ ] **Step 1: Write failing hill and party tests**

```js
it('builds a natural mountain opening with a visible water destination',()=>{
  const world=createHillWorld(createMaterials(),'desktop')
  ;['hill-terrain','hill-ridges','hill-rock-faces','hill-vegetation','hill-mist','hill-trail','mountain-water-landing','distant-water-glint']
    .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  ;['glacier','drifting-snow','ice-foreground','monument']
    .forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
  expect(world.userData.route.getPoints(24).every(point=>Math.abs(point.y-world.userData.heightAt(point.x,point.z))<.3)).toBe(true)
})

it('creates one guide and three independently phased tourists',()=>{
  const party=createTrekkingParty(createMaterials())
  expect(party.userData.members).toHaveLength(4)
  expect(party.userData.members.filter(member=>member.role==='guide')).toHaveLength(1)
  expect(party.userData.members.filter(member=>member.role==='tourist')).toHaveLength(3)
  expect(new Set(party.userData.members.map(member=>member.phase)).size).toBe(4)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Build natural terrain and mountain depth**

Create a 72×78 displaced foreground terrain with 112×120 desktop segments and 64×76 mobile segments. Color vertices by height and slope using grass `#49683c`, soil `#6b5841`, and rock `#59615e`. Build three irregular displaced ridge ribbons behind it with progressively cooler, lighter materials. Add deterministic rock outcrops, bushes, grass clusters, and varied hill trees outside a 1.3-unit trail corridor.

- [ ] **Step 4: Build the descending trail and water reveal**

Create 32 route points from `LANDMARKS.mountainStart` to `LANDMARKS.mountainLanding`; set each Y to `sampleMountainHeight(x,z)+.08`. Add a narrow earth ribbon, wet stones and reeds near the bottom, a timber landing, mist pockets, and a broad low-opacity `distant-water-glint` plane framed between ridges so water is visible from the opening camera.

- [ ] **Step 5: Build and animate the four-person trekking party**

Use an articulated member factory with head, hair, layered torso, trousers, boots, backpack, straps, roll mat, arms, legs, and walking pole. Give the guide a green jacket and ochre pack; use distinct navy/yellow, rust/charcoal, and teal/tan tourist palettes. Store phases `[0,1.37,2.91,4.42]` and route offsets `[0,.055,.11,.165]`. Plant every root at `heightAt(x,z)`, face the route tangent, animate opposite limbs, and disable secondary sway under reduced motion.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: hill and party tests pass.

```bash
git add src/three/hillWorld.js src/three/hillWorld.test.js src/three/trekkingParty.js src/three/trekkingParty.test.js
git commit -m "Build natural mountain trekking opening"
```

