import * as THREE from 'three'

// Destinations shown as glowing pins on the globe (lat, lon in degrees)
const PINS = [
  { name: 'Santorini', lat: 36.4, lon: 25.4 },
  { name: 'Kyoto', lat: 35.0, lon: 135.8 },
  { name: 'Serengeti', lat: -2.3, lon: 34.8 },
  { name: 'Reykjavik', lat: 64.1, lon: -21.9 },
  { name: 'Machu Picchu', lat: -13.2, lon: -72.5 },
  { name: 'Udaipur', lat: 24.6, lon: 73.7 },
  { name: 'Bali', lat: -8.3, lon: 115.1 },
  { name: 'Patagonia', lat: -50.3, lon: -72.3 },
]

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

export function createGlobeScene(canvas) {
  const accent = new THREE.Color('#e2a545')
  const accentDim = new THREE.Color('#7a5a2c')

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 7.2)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const group = new THREE.Group()
  scene.add(group)

  // wireframe globe
  const globeGeo = new THREE.IcosahedronGeometry(2.35, 3)
  const globeMat = new THREE.MeshBasicMaterial({ color: '#3d4250', wireframe: true, transparent: true, opacity: 0.55 })
  const globe = new THREE.Mesh(globeGeo, globeMat)
  group.add(globe)

  // soft inner core for depth
  const coreGeo = new THREE.SphereGeometry(2.2, 32, 32)
  const coreMat = new THREE.MeshBasicMaterial({ color: '#12141c', transparent: true, opacity: 0.85 })
  const core = new THREE.Mesh(coreGeo, coreMat)
  group.add(core)

  // destination pins
  const pinGroup = new THREE.Group()
  const pinGeo = new THREE.SphereGeometry(0.045, 12, 12)
  const pinMat = new THREE.MeshBasicMaterial({ color: accent })
  const pinMeshes = []

  PINS.forEach((p) => {
    const pos = latLonToVector3(p.lat, p.lon, 2.36)
    const pin = new THREE.Mesh(pinGeo, pinMat.clone())
    pin.position.copy(pos)
    pin.userData.baseScale = 1
    pinGroup.add(pin)
    pinMeshes.push(pin)

    // glow halo sprite
    const haloMat = new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: accent,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const halo = new THREE.Sprite(haloMat)
    halo.scale.set(0.5, 0.5, 0.5)
    halo.position.copy(pos)
    pinGroup.add(halo)
  })
  group.add(pinGroup)

  // arcs connecting a few pins (flight-path feel)
  const arcMat = new THREE.LineBasicMaterial({ color: accentDim, transparent: true, opacity: 0.5 })
  for (let i = 0; i < PINS.length; i++) {
    const a = latLonToVector3(PINS[i].lat, PINS[i].lon, 2.36)
    const b = latLonToVector3(PINS[(i + 3) % PINS.length].lat, PINS[(i + 3) % PINS.length].lon, 2.36)
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(3.1)
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    const points = curve.getPoints(32)
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geo, arcMat)
    group.add(line)
  }

  // starfield
  const starCount = 700
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const r = 20 + Math.random() * 30
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.035, transparent: true, opacity: 0.55 })
  const stars = new THREE.Points(starGeo, starMat)
  scene.add(stars)

  function makeGlowTexture() {
    const size = 128
    const canvasEl = document.createElement('canvas')
    canvasEl.width = size
    canvasEl.height = size
    const ctx = canvasEl.getContext('2d')
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvasEl)
    return tex
  }

  let width = 1
  let height = 1
  function resize() {
    const parent = canvas.parentElement
    if (!parent) return
    width = parent.clientWidth
    height = parent.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const pointer = { x: 0, y: 0 }
  function setPointer(nx, ny) {
    pointer.x = nx
    pointer.y = ny
  }

  let raf
  const clock = new THREE.Clock()

  function animate() {
    const t = clock.getElapsedTime()
    group.rotation.y = t * 0.08 + pointer.x * 0.4
    group.rotation.x = pointer.y * 0.25
    stars.rotation.y = t * 0.01

    pinMeshes.forEach((pin, i) => {
      const pulse = 1 + Math.sin(t * 2 + i) * 0.25
      pin.scale.setScalar(pulse)
    })

    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04
    camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)

    renderer.render(scene, camera)
    raf = requestAnimationFrame(animate)
  }

  const resizeObserver = new ResizeObserver(resize)
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)
  resize()
  animate()

  function dispose() {
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    ;[globeGeo, coreGeo, pinGeo, starGeo].forEach((g) => g.dispose())
    ;[globeMat, coreMat, pinMat, starMat, arcMat].forEach((m) => m.dispose())
    pinMeshes.forEach((p) => p.material.dispose())
    renderer.dispose()
  }

  return { setPointer, dispose }
}
