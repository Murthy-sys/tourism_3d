import * as THREE from 'three'
import { createMaterials, disposeObject3D, mesh } from './primitives'
import { createIndiaRegions } from './regions'
import { clamp01, getJourneyState } from './journeyData'
import { createAmbassador, updateAmbassador } from './ambassador'
import { createExpeditionController } from './expeditionController'

export const getRenderQuality = (width) => width < 768 ? 'mobile' : 'desktop'
export const getMobileTrekCamera=([x,y,z])=>({camera:[x+3,y+2.2,z+8],target:[x,y+.9,z]})
export const getWorldVisibility=phase=>({
  'vehicle-intro':['south','deccan'],
  operations:['deccan','tourism-operations-pavilion'],
  plans:[],
  contact:[],
}[phase]||[])

export function createIndiaJourney(canvas,{ reducedMotion=false, onContextLost=()=>{} }={}){
  const quality=getRenderQuality(window.innerWidth),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,300)
  const renderer=new THREE.WebGLRenderer({canvas,antialias:quality==='desktop',alpha:false,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='mobile'?1.25:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=quality==='desktop';renderer.shadowMap.type=THREE.PCFSoftShadowMap
  scene.fog=new THREE.Fog('#8fc7c7',20,75);scene.background=new THREE.Color('#8fc7c7')
  scene.add(new THREE.HemisphereLight('#ffd9b0','#283c43',2.3));const sun=new THREE.DirectionalLight('#ffb46f',3.4);sun.position.set(-15,18,12);sun.castShadow=quality==='desktop';scene.add(sun)
  const materials=createMaterials(),world=createIndiaRegions(materials,quality);scene.add(world)
  const journeyGround=mesh(new THREE.PlaneGeometry(70,180),materials.road,[0,-.22,-68],[-Math.PI/2,0,0]);journeyGround.name='journey-ground';scene.add(journeyGround)
  const routePoints=[];for(let i=0;i<55;i++)routePoints.push(new THREE.Vector3(Math.sin(i*.5)*2,.08,4-i*2.7));const routeCurve=new THREE.CatmullRomCurve3(routePoints),route=mesh(new THREE.TubeGeometry(routeCurve,220,.045,6,false),materials.gold);route.name='travel-route';scene.add(route)
  const traveler=createAmbassador(materials);scene.add(traveler)
  const expedition=createExpeditionController(scene,materials,quality)
  const clock=new THREE.Clock()
  let progress=0,pointer={x:0,y:0},raf,paused=false,target=new THREE.Vector3(),lost=false
  const resize=()=>{const p=canvas.parentElement;if(!p)return;renderer.setSize(p.clientWidth,p.clientHeight,false);camera.aspect=p.clientWidth/Math.max(1,p.clientHeight);camera.updateProjectionMatrix()}
  const ro=new ResizeObserver(resize);if(canvas.parentElement)ro.observe(canvas.parentElement);resize()
  const animate=()=>{if(paused||lost)return;const s=getJourneyState(progress),elapsed=clock.getElapsedTime();let p=new THREE.Vector3(...s.cameraPosition),visible=new Set(getWorldVisibility(s.phase));world.children.forEach(group=>{group.visible=visible.has(group.name)});updateAmbassador(traveler,routeCurve,Math.min(progress,.41),elapsed,reducedMotion);const ambassadorVisible=s.expedition.phase==='ambassador'||s.expedition.phase==='ambassador-to-jeep';traveler.visible=ambassadorVisible;route.visible=ambassadorVisible;journeyGround.visible=s.phase==='vehicle-intro'||s.phase==='operations';expedition.update(s.expedition,elapsed,reducedMotion);let t=s.phase==='vehicle-intro'?traveler.position.clone().add(new THREE.Vector3(0,1,0)):new THREE.Vector3(...s.cameraTarget);if(quality==='mobile'&&s.expedition.phase==='ice-trek'){const walker=expedition.transports.trekker.getWorldPosition(new THREE.Vector3()),framing=getMobileTrekCamera(walker.toArray());p=new THREE.Vector3(...framing.camera);t=new THREE.Vector3(...framing.target)}if(!reducedMotion){p.x+=pointer.x*.45;p.y-=pointer.y*.25}camera.position.lerp(p,.055);target.lerp(t,.055);camera.lookAt(target);scene.background.lerp(new THREE.Color(s.palette.sky),.025);scene.fog.color.copy(scene.background);renderer.render(scene,camera);raf=requestAnimationFrame(animate)}
  const onLost=e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);onContextLost()};canvas.addEventListener('webglcontextlost',onLost);animate()
  return {setProgress:v=>{progress=clamp01(v)},setPointer:(x,y)=>{pointer={x,y}},setReducedMotion:v=>{reducedMotion=v},pause:()=>{paused=true;cancelAnimationFrame(raf)},resume:()=>{if(paused){paused=false;animate()}},dispose:()=>{cancelAnimationFrame(raf);ro.disconnect();canvas.removeEventListener('webglcontextlost',onLost);disposeObject3D(scene);renderer.dispose()}}
}
