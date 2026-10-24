import * as THREE from 'three'
import {mesh} from './primitives'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {createContactShadow} from './expeditionPeople'
import {createRealisticVehicle} from './realisticVehicles'
import {
  COACH_AXLES,COACH_ARCH_RADIUS,combineCoachGeometry,coachSurface,
  coachSidePanel,coachWindshield,coachSideGlass,coachRearGlazingCorner,coachRoof,
  coachPaintVariation,coachRoughnessMap,coachWheelGeometry,
} from './coachGeometry'

const DIMENSIONS=Object.freeze({length:11.8,width:2.55,overallHeight:3.55,wheelRadius:.48})
const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}
const namedMesh=(name,geometry,material,position=[0,0,0],rotation=[0,0,0])=>{
  const object=mesh(geometry,material,position,rotation)
  object.name=name
  return object
}
const box=(dimensions,position,rotation=[0,0,0])=>{
  const geometry=new THREE.BoxGeometry(...dimensions)
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(1,1,1),
  ))
  return geometry
}
const tube=(points,radius,quality)=>new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point))),
  quality==='mobile'?8:16,radius,quality==='mobile'?5:8,false,
)

const createPalette=()=>{
  const roughnessMap=coachRoughnessMap()
  return {
    body:new THREE.MeshPhysicalMaterial({color:'#b9bcb5',vertexColors:true,roughness:.49,roughnessMap,metalness:.1,clearcoat:.24,clearcoatRoughness:.36}),
    lower:new THREE.MeshStandardMaterial({color:'#343b3c',roughness:.68,roughnessMap,metalness:.18}),
    livery:new THREE.MeshStandardMaterial({color:'#746855',roughness:.55,metalness:.22}),
    glass:new THREE.MeshPhysicalMaterial({color:'#101d21',roughness:.17,metalness:.12,clearcoat:.52,clearcoatRoughness:.2,envMapIntensity:.85}),
    tire:new THREE.MeshStandardMaterial({color:'#181a19',roughness:.96,roughnessMap,metalness:0}),
    rim:new THREE.MeshStandardMaterial({color:'#929b9b',roughness:.34,metalness:.82}),
    dark:new THREE.MeshStandardMaterial({color:'#171d1e',roughness:.76,metalness:.13}),
    light:new THREE.MeshPhysicalMaterial({color:'#dce2dd',emissive:'#aebcb5',emissiveIntensity:.1,roughness:.22,metalness:.15,clearcoat:.5}),
    redLight:new THREE.MeshStandardMaterial({color:'#6f2420',emissive:'#64150c',emissiveIntensity:.16,roughness:.27}),
  }
}

const createTourLabel=()=>{
  const glyphs={X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],T:['11111','00100','00100','00100','00100','00100','00100'],O:['01110','10001','10001','10001','10001','10001','01110'],U:['10001','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110']}
  Object.assign(glyphs,{
    A:['01110','10001','10001','11111','10001','10001','10001'],
    V:['10001','10001','10001','10001','10001','01010','00100'],
    E:['11111','10000','10000','11110','10000','10000','11111'],
    L:['10000','10000','10000','10000','10000','10000','11111'],
  })
  const width=288,height=32,data=new Uint8Array(width*height*4)
  Array.from('XYZ TRAVELLERS').forEach((letter,index)=>glyphs[letter]?.forEach((row,y)=>{
    Array.from(row).forEach((pixel,x)=>{
      if(pixel!=='1') return
      for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){
        const offset=((height-1-(5+y*3+dy))*width+15+index*18+x*3+dx)*4
        data.set([255,255,255,255],offset)
      }
    })
  }))
  const texture=new THREE.DataTexture(data,width,height)
  texture.colorSpace=THREE.SRGBColorSpace
  texture.magFilter=THREE.LinearFilter
  texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.generateMipmaps=true
  texture.needsUpdate=true
  texture.userData.ownedByJourney=true
  return texture
}

const createDetailedCoach=(coach,quality)=>{
  coach.name='tour-coach'
  const body=coach.getObjectByName('body')
  body.name='coach-body'
  const paint=body.children.find(object=>object.material?.name==='paint')
  if(paint) paint.name='tour-coach-shell'
  const wheels=[0,1,2,3].map(index=>coach.getObjectByName(`wheel-${index}`))
  coach.updateMatrixWorld(true)
  // Normalize the actual tire meshes, including their authored tread, to the road.
  const tireBottom=Math.min(...wheels.map(wheel=>new THREE.Box3().setFromObject(wheel,true).min.y))
  coach.children.forEach(child=>{child.position.y-=tireBottom})
  const doors=[coach.getObjectByName('entry-0'),coach.getObjectByName('entry-1')].filter(Boolean)
  doors.forEach((door,index)=>{door.rotation.y=index===0?1.05:-1.05})
  const labelMap=createTourLabel()
  const destination=new THREE.MeshBasicMaterial({color:'#e6ddbd',map:labelMap,transparent:true,alphaTest:.25,depthWrite:false,toneMapped:false})
  const livery=new THREE.MeshBasicMaterial({color:'#30443e',map:labelMap,transparent:true,alphaTest:.25,depthWrite:false,toneMapped:false})
  coach.add(namedMesh('tour-coach-destination-XYZ-TRAVELLERS',new THREE.PlaneGeometry(1.9,.26),destination,[0,2.73,-5.804],[0,Math.PI,0]))
  ;[-1,1].forEach(side=>coach.add(namedMesh('tour-coach-XYZ-TRAVELLERS-livery',new THREE.PlaneGeometry(2.5,.28),livery,[side*1.237,.95,1.8],[0,side*Math.PI/2,0])))
  const contactShadow=createContactShadow(3.4,12.3,.32)
  contactShadow.position.y=.012
  coach.add(contactShadow)
  coach.updateMatrixWorld(true)
  const vehicleBounds=new THREE.Box3().setFromObject(coach,true)
  const wheelBounds=new THREE.Box3().setFromObject(wheels[0],true)
  Object.assign(coach.userData,{
    quality,destination:'XYZ TRAVELLERS',dimensions:{...DIMENSIONS,overallHeight:vehicleBounds.max.y,wheelRadius:(wheelBounds.max.y-wheelBounds.min.y)/2},
    wheels,wheelContactPoints:wheels.map(wheel=>new THREE.Vector3(wheel.position.x,0,wheel.position.z)),groundOffset:0,
    footprint:new THREE.Box3(new THREE.Vector3(-DIMENSIONS.width/2,0,-DIMENSIONS.length/2),new THREE.Vector3(DIMENSIONS.width/2,vehicleBounds.max.y,DIMENSIONS.length/2)),
    vehicleBounds,doorClearance:new THREE.Box3(new THREE.Vector3(1.15,0,-5.3),new THREE.Vector3(1.9,2.5,-4)),
    entryApproach:new THREE.Box3(new THREE.Vector3(1.35,0,-5.4),new THREE.Vector3(3.25,2.3,-3.9)),
    forward:new THREE.Vector3(0,0,-1),entryNormal:new THREE.Vector3(1,0,0),
  })
  return coach
}

export function createTourCoach(quality='desktop'){
  const detailed=createRealisticVehicle('bus')
  if(detailed) return createDetailedCoach(detailed,quality)
  const coach=namedGroup('tour-coach'),palette=createPalette()
  const body=namedGroup('coach-body'),glazing=namedGroup('coach-glazing')
  const arches=namedGroup('coach-wheel-arches'),wheels=namedGroup('coach-wheels')
  const entry=namedGroup('coach-entry'),details=namedGroup('coach-exterior-details')
  const segments=quality==='mobile'?12:24
  const paint=geometry=>coachPaintVariation(geometry)
  const aggregate=(name,parts,material)=>namedMesh(name,combineCoachGeometry(parts),material)

  // Side panels terminate at the wheel wells and the open passenger doorway.
  // There is no solid box behind their cutouts.
  const shellParts=[
    coachSidePanel(-1,-5.7,5.7,quality),
    coachSidePanel(1,-5.7,-4.08,quality),
    coachSidePanel(1,-3.08,5.7,quality),
    coachSurface(segments,5,(u,v)=>{
      const x=u*2-1
      return [x*(1.18+.075*v),.42+1.21*v,-5.89+.19*Math.pow(Math.abs(x),3)+.04*(1-v)]
    }),
    coachSurface(segments,8,(u,v)=>{
      const x=u*2-1
      return [x*(1.25-.11*Math.pow(v,4)),.42+2.76*v,5.89-.19*Math.pow(Math.abs(x),3)-.31*Math.pow(v,5)]
    },true),
  ]
  body.add(namedMesh('tour-coach-shell',paint(combineCoachGeometry(shellParts)),palette.body))
  const roof=combineCoachGeometry([
    coachRoof(quality),
    coachSurface(segments,4,(u,v)=>{
      const across=u*2-1
      return [across*(1.12+.015*v),3.2+v*(-.02+.37*Math.sqrt(Math.max(0,1-across*across))),
        (-5.5+.19*Math.pow(Math.abs(across),3))*(1-v)-5.43*v]
    }),
    coachSurface(segments,4,(u,v)=>{
      const across=u*2-1
      return [across*(1.14-.005*v),3.18+v*.37*Math.sqrt(Math.max(0,1-across*across)),
        (5.58-.19*Math.pow(Math.abs(across),3))*(1-v)+5.43*v]
    },true),
  ])
  body.add(namedMesh('tour-coach-roof',paint(roof),palette.body))

  const lowerParts=[],stripeParts=[],trimParts=[],metalParts=[]
  // Lower valances share the arch contour instead of bridging across the tires.
  ;[-1,1].forEach(side=>{
    const runs=side<0?[[-5.7,5.7]]:[[-5.7,-4.08],[-3.08,5.7]]
    runs.forEach(([start,end])=>{
      const panel=coachSidePanel(side,start,end,quality,1.23,.42)
      panel.translate(side*.003,0,0)
      lowerParts.push(panel)
      stripeParts.push(box([.015,.045,end-start],[side*1.279,1.72,(start+end)/2]))
      trimParts.push(box([.015,.035,end-start],[side*1.276,1.835,(start+end)/2]))
    })
    // Recessed luggage-door breaks and low, properly scaled flush handles.
    ;[-1.25,.1,1.45].forEach(z=>{
      trimParts.push(box([.012,.48,.012],[side*1.28,1.49,z]))
      metalParts.push(box([.018,.025,.16],[side*1.287,1.58,z+.58]))
    })
    for(let index=0;index<7;index++){
      trimParts.push(box([.018,.017,.76],[side*1.28,1.33+index*.045,4.66]))
    }
  })
  body.add(aggregate('tour-coach-lower-trim',lowerParts,palette.lower))
  body.add(aggregate('tour-coach-livery',stripeParts,palette.livery))

  glazing.add(namedMesh('tour-coach-windscreen',coachWindshield(quality),palette.glass))
  glazing.add(namedMesh('tour-coach-side-glass-left',coachSideGlass(-1,-5.7,5.5,quality),palette.glass))
  glazing.add(aggregate('tour-coach-side-glass-right',[
    coachSideGlass(1,-5.7,-4.08,quality),
    coachSideGlass(1,-3.08,5.5,quality),
    coachSideGlass(1,-4.08,-3.08,quality,2.65,3.18),
  ],palette.glass))
  glazing.add(aggregate('tour-coach-rear-window',[
    coachSurface(segments,5,(u,v)=>{
      const x=(u*2-1)*1.07,y=2.02+v*.98,bodyV=(y-.42)/2.76
      return [x,y,5.89-.19*Math.pow(Math.abs(x/(1.25-.11*Math.pow(bodyV,4))),3)-.31*Math.pow(bodyV,5)+.008]
    },true),
    coachRearGlazingCorner(-1,quality),coachRearGlazingCorner(1,quality),
  ],palette.glass))

  // Slim opaque pillars lie on the curved glass, with continuous panes between.
  ;[-1,1].forEach(side=>{
    ;[-4.08,-3.08,-1.55,.05,1.65,3.25,4.9].forEach(z=>{
      trimParts.push(tube([[side*1.273,1.86,z],[side*1.249,2.5,z],[side*1.18,3.18,z]],.017,quality))
    })
    trimParts.push(tube([[side*1.19,1.63,-5.7],[side*1.22,2.35,-5.53],[side*1.12,3.2,-5.31]],.035,quality))
    trimParts.push(tube([[side*1.18,3.19,-5.31],[side*1.18,3.19,0],[side*1.18,3.19,5.34]],.026,quality))
  })
  // A raked screen, separate bumper, individual projector lamps and inset slats.
  const bumper=coachSurface(segments,3,(u,v)=>{
    const x=u*2-1
    return [x*(1.2+.04*v),.43+v*.18,-5.9+.19*Math.pow(Math.abs(x),3)]
  })
  details.add(namedMesh('tour-coach-front-bumper',bumper,palette.lower))
  const grilleParts=[box([1.1,.23,.055],[0,.86,-5.884])]
  for(let index=0;index<5;index++){
    metalParts.push(box([1.06,.012,.012],[0,.765+index*.044,-5.918]))
  }
  details.add(aggregate('tour-coach-grille',grilleParts,palette.dark))
  const headlightParts=[],tailParts=[],lampRecesses=[]
  ;[-1,1].forEach(side=>{
    lampRecesses.push(box([.46,.245,.045],[side*.862,1.15,-5.837],[0,side*-.1,0]))
    ;[.75,.945].forEach(x=>{
      const lamp=new THREE.CylinderGeometry(.065,.07,.023,segments)
      lamp.rotateX(Math.PI/2)
      lamp.translate(side*x,1.16,-5.872+.02*(x>.8?1:0))
      headlightParts.push(lamp)
    })
    headlightParts.push(box([.36,.023,.025],[side*.85,1.055,-5.867]))
    tailParts.push(box([.105,.43,.025],[side*1.07,1.27,5.784]))
    metalParts.push(box([.12,.018,.02],[side*1.07,1.27,5.803]))
  })
  details.add(aggregate('tour-coach-headlamp-recesses',lampRecesses,palette.dark))
  details.add(aggregate('tour-coach-headlights',headlightParts,palette.light))
  details.add(aggregate('tour-coach-tail-lights',tailParts,palette.redLight))
  ;[-1,1].forEach(side=>{
    trimParts.push(tube([[side*.69,1.7,-5.863],[side*.51,2.14,-5.78],[side*.38,2.4,-5.714]],.011,quality))
    trimParts.push(tube([[side*.17,2.19,-5.76],[side*.39,2.4,-5.715],[side*.62,2.61,-5.65]],.014,quality))
  })
  details.add(aggregate('tour-coach-panel-seals',trimParts,palette.dark))
  details.add(aggregate('tour-coach-metal-fittings',metalParts,palette.rim))

  const wheelSpecs=COACH_AXLES.flatMap((z,index)=>[-1,1].map(side=>({
    axle:index===0?'front':'rear',side:side<0?'left':'right',x:side*1.105,z,
  })))
  const wheelGeometry=coachWheelGeometry(quality)
  const wheelRoots=wheelSpecs.map(spec=>{
    const side=Math.sign(spec.x),root=namedGroup(`tour-coach-wheel-${spec.axle}-${spec.side}`)
    root.position.set(spec.x,DIMENSIONS.wheelRadius,spec.z)
    root.rotation.z=side<0?Math.PI/2:-Math.PI/2
    root.userData={axle:spec.axle,side:spec.side}
    root.add(
      namedMesh('tour-coach-tire',wheelGeometry.tire,palette.tire),
      namedMesh('tour-coach-rim',wheelGeometry.rim,palette.rim),
      namedMesh('tour-coach-brake-drum',wheelGeometry.drum,palette.dark),
    )
    wheels.add(root)
    const arch=new THREE.TorusGeometry(COACH_ARCH_RADIUS,.018,quality==='mobile'?5:8,segments,Math.PI)
    arches.add(namedMesh(`tour-coach-wheel-arch-${spec.axle}-${spec.side}`,arch,palette.lower,
      [side*1.276,.48,spec.z],[0,side>0?-Math.PI/2:Math.PI/2,0]))
    return root
  })

  const doorPivot=namedGroup('tour-coach-door-pivot')
  doorPivot.position.set(1.35,1.5,-3.58)
  doorPivot.rotation.y=-.72
  doorPivot.add(namedMesh('tour-coach-door-open',new THREE.BoxGeometry(.055,1.86,.82),palette.glass,[0,0,.41]))
  doorPivot.add(aggregate('tour-coach-door-frame',[
    box([.065,1.92,.035],[0,0,.015]),box([.065,1.92,.035],[0,0,.805]),
    box([.065,.035,.82],[0,.945,.41]),box([.065,.035,.82],[0,-.945,.41]),
    box([.09,.26,.025],[.04,-.13,.72]),
  ],palette.dark))
  entry.add(doorPivot,namedMesh('tour-coach-door-opening',new THREE.BoxGeometry(.035,2.04,.96),palette.dark,[.92,1.5,-3.58]))
  ;[
    {name:'tour-coach-entry-step-1',x:1.57,y:.12},
    {name:'tour-coach-entry-step-2',x:1.45,y:.3},
    {name:'tour-coach-entry-step-3',x:1.34,y:.48},
  ].forEach(({name,x,y})=>entry.add(namedMesh(name,new THREE.BoxGeometry(.52,.12,.76),palette.dark,[x,y,-3.58])))
  entry.add(namedMesh('tour-coach-entry-threshold',new THREE.BoxGeometry(.5,.1,.82),palette.lower,[1.28,.65,-3.58]))
  entry.add(aggregate('tour-coach-step-edges',[
    box([.022,.016,.72],[1.829,.183,-3.58]),
    box([.022,.016,.72],[1.709,.363,-3.58]),
    box([.022,.016,.72],[1.599,.543,-3.58]),
  ],palette.rim))

  ;[-1,1].forEach(side=>{
    const mirror=namedGroup(`tour-coach-${side<0?'left':'right'}-mirror`)
    const mounting=[side*1.19,2.88,-5.39],housing=[side*1.54,2.67,-5.61]
    const stalk=tube([mounting,[side*1.51,2.98,-5.48],[side*1.57,2.86,-5.59],housing],.033,quality)
    const casing=new RoundedBoxGeometry(.19,.4,.21,quality==='mobile'?1:2,.045)
    casing.translate(...housing)
    mirror.add(aggregate('tour-coach-mirror-mount',[stalk,casing],palette.dark))
    mirror.add(namedMesh('tour-coach-mirror-glass',new THREE.PlaneGeometry(.126,.31),palette.rim,[side*1.54,2.67,-5.499]))
    mirror.userData={mounting:new THREE.Vector3(...mounting),housing:new THREE.Vector3(...housing)}
    details.add(mirror)
  })

  const contactShadow=createContactShadow(3.4,12.3,.32)
  contactShadow.position.y=.018
  coach.add(body,glazing,arches,wheels,entry,details,contactShadow)
  coach.traverse(object=>{
    if(object.isMesh){object.castShadow=true;object.receiveShadow=true}
  })
  contactShadow.castShadow=false
  contactShadow.receiveShadow=false
  coach.updateMatrixWorld(true)
  coach.userData={
    quality,dimensions:{...DIMENSIONS},wheels:wheelRoots,
    wheelContactPoints:wheelSpecs.map(spec=>new THREE.Vector3(spec.x,0,spec.z)),
    groundOffset:0,
    footprint:new THREE.Box3(new THREE.Vector3(-DIMENSIONS.width/2,0,-DIMENSIONS.length/2),new THREE.Vector3(DIMENSIONS.width/2,DIMENSIONS.overallHeight,DIMENSIONS.length/2)),
    vehicleBounds:new THREE.Box3().setFromObject(coach),
    doorClearance:new THREE.Box3(new THREE.Vector3(1.22,.02,-4.12),new THREE.Vector3(2.28,2.55,-3.02)),
    entryApproach:new THREE.Box3(new THREE.Vector3(1.35,0,-4.25),new THREE.Vector3(3.25,2.25,-2.9)),
    forward:new THREE.Vector3(0,0,-1),entryNormal:new THREE.Vector3(1,0,0),
  }
  return coach
}
