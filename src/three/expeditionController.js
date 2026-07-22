import { createExpeditionBoat,createExpeditionJeep,createTrekker,updateBoat,updateJeep,updateTrekker } from './expeditionVehicles'
import { createJungleWorld } from './jungleWorld'
import { createWaterWorld,updateWaterWorld } from './waterWorld'
import { createIceWorld,updateIceWorld } from './iceWorld'

export const getExpeditionVisibility=({phase})=>({
  'ambassador-to-jeep':{worlds:['jungle'],transports:['jeep']},
  'jungle-jeep':{worlds:['jungle'],transports:['jeep']},
  'jeep-to-boat':{worlds:['jungle','water'],transports:['jeep','boat']},
  'water-boat':{worlds:['water'],transports:['boat']},
  'boat-to-trek':{worlds:['water','ice'],transports:['boat','trekker']},
  'ice-trek':{worlds:['ice'],transports:['trekker']},
  contact:{worlds:['ice'],transports:['trekker']},
}[phase]||{worlds:[],transports:[]})
export const getIceLayerVisibility=(phase,quality)=>({foreground:phase!=='contact'&&quality!=='mobile',midground:phase!=='contact'})

export function createExpeditionController(scene,materials,quality){
  const jungle=createJungleWorld(materials,quality),water=createWaterWorld(materials,quality),ice=createIceWorld(materials,quality)
  jungle.position.z=-52;water.position.z=-94;ice.position.z=-132
  const jeep=createExpeditionJeep(materials),boat=createExpeditionBoat(materials),trekker=createTrekker(materials)
  jungle.add(jeep);water.add(boat);ice.add(trekker);scene.add(jungle,water,ice)
  const worlds={jungle,water,ice},transports={jeep,boat,trekker}
  const update=(state,elapsed,reducedMotion)=>{
    const visible=getExpeditionVisibility(state);Object.entries(worlds).forEach(([name,world])=>{world.visible=visible.worlds.includes(name)});Object.entries(transports).forEach(([name,transport])=>{transport.visible=visible.transports.includes(name)})
    const iceLayers=getIceLayerVisibility(state.phase,quality);ice.getObjectByName('ice-foreground').visible=iceLayers.foreground;ice.getObjectByName('ice-midground').visible=iceLayers.midground
    const p=state.localProgress
    if(visible.transports.includes('jeep'))updateJeep(jeep,jungle.userData.route,state.phase==='jeep-to-boat'?1:p,elapsed,reducedMotion)
    if(visible.transports.includes('boat'))updateBoat(boat,water.userData.route,state.phase==='jeep-to-boat'?Math.min(1,p*.25):state.phase==='boat-to-trek'?1:p,elapsed,reducedMotion)
    if(visible.transports.includes('trekker'))updateTrekker(trekker,ice.userData.route,state.phase==='boat-to-trek'?Math.min(1,p*.2):p,elapsed,reducedMotion)
    updateWaterWorld(water,elapsed,boat);updateIceWorld(ice,elapsed,trekker)
  }
  return{update,worlds,transports,dispose:()=>{scene.remove(jungle,water,ice)}}
}
