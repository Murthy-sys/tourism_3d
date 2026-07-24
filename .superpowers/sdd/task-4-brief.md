### Task 4: Dense forest and physical marsh landing

**Files:**
- Modify: `src/three/jungleWorld.js`
- Modify: `src/three/jungleWorld.test.js`

**Interfaces:**
- Preserves: `createJungleWorld(materials, quality)` and `world.userData.route`.
- Adds named groups: `jungle-undergrowth`, `jungle-vines`, `jungle-fallen-timber`, `forest-marsh-edge`, `forest-landing`.

- [ ] **Step 1: Extend the failing forest contract**

Assert all five new named groups exist; desktop has at least 55 trees and 140 undergrowth meshes; mobile has at least 32 trees and 70 undergrowth meshes; and the route endpoint is within six world units of `forest-landing`.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/jungleWorld.test.js`

Expected: FAIL because the new layers and density are absent.

- [ ] **Step 3: Implement deterministic density and variation**

Replace index-row placement with a deterministic hash function based on index. Create at least six crown silhouettes, branch forks, trunk taper, ferns, broad leaves, grass clumps, vines, fallen logs, roots, and wet stones. Reserve a corridor around the jeep path and progressively reduce canopy density toward the marsh edge.

- [ ] **Step 4: Build the marsh and handoff landing**

Extend damp ground toward the water-side end using dark soil, shallow reflective patches, reeds, roots, and a timber landing aligned to the jeep endpoint. Store it as `world.userData.landing`.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js`

Expected: forest and jeep tests pass.

```bash
git add src/three/jungleWorld.js src/three/jungleWorld.test.js
git commit -m "Densify forest and add marsh landing"
```

