### Task 5: Connected reflective water corridor

**Files:**
- Modify: `src/three/waterWorld.js`
- Modify: `src/three/waterWorld.test.js`

**Interfaces:**
- Preserves: `createWaterWorld`, `updateWaterWorld`, `world.userData.route`, and boat wake behavior.
- Adds: `forest-water-landing`, `hill-water-landing`, `river-banks`, `water-shallows`, `water-reflection-layer`.

- [ ] **Step 1: Extend the failing water contract**

Assert all five new groups exist, route start lies near the forest landing, route end lies near the hill landing, and the bank separation at the route end is less than at its start.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/waterWorld.test.js`

Expected: FAIL because the connected river corridor is absent.

- [ ] **Step 3: Build the narrowing corridor**

Replace the rectangular shoreline slabs with shaped bank meshes whose inner edge narrows from 12 units to 5 units along Z. Add a lighter transparent shallow-water strip along each bank, wet-rock materials, reed clusters, and tree density that increases again near the hill landing.

- [ ] **Step 4: Improve surface depth cues**

Keep the existing water material and add a second low-opacity reflection layer with subtle vertex displacement. In `updateWaterWorld`, animate the two layers at different amplitudes and update the wake without changing the upgraded boat.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: water and boat tests pass.

```bash
git add src/three/waterWorld.js src/three/waterWorld.test.js
git commit -m "Connect water corridor to forest and hills"
```

