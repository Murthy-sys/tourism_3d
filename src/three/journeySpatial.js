// Longitudinal coordinates for the expanded valley. Scenery is positioned along
// this layout; individual trees, rocks, decks and vehicles keep their real size.
export const mapJourneyZ=z=>{
  if(z>=-34) return z
  if(z>=-86) return -34+(z+34)*2
  if(z>=-132) return -138+(z+86)*2
  return z-98
}

export const FINALE_OFFSET_Z=-98
export const shiftFinaleZ=z=>z+FINALE_OFFSET_Z
