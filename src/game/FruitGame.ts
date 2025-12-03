import * as THREE from 'three'
import type { GestureEvent } from '@/types'

const FRUIT_COLORS = [0xff6b6b, 0xffd93d, 0x6ee7b7, 0x7dd3fc]
const GRAVITY = new THREE.Vector3(0, -3.5, 0)

interface FruitBody {
  id: string
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  createdAt: number
}

interface SliceEffect {
  object: THREE.Points
  elapsed: number
  lifespan: number
  material: THREE.PointsMaterial
}

export class FruitGame {
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private fruits: FruitBody[] = []
  private effects: SliceEffect[] = []
  private animationHandle: number | null = null
  private lastTime = performance.now()
  private spawnAccumulator = 0
  private canvas: HTMLCanvasElement
  private projectionHelper = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 1.5, 4)
    this.camera.lookAt(0, 1, 0)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(4, 6, 4)
    this.scene.add(keyLight)

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  start() {
    if (this.animationHandle) return
    this.lastTime = performance.now()
    this.animationHandle = this.renderer.setAnimationLoop(this.tick)
  }

  stop() {
    if (!this.animationHandle) return
    this.renderer.setAnimationLoop(null)
    this.animationHandle = null
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    this.fruits.forEach((fruit) => {
      this.scene.remove(fruit.mesh)
      fruit.mesh.geometry.dispose()
      if (Array.isArray(fruit.mesh.material)) {
        fruit.mesh.material.forEach((mat) => mat.dispose())
      } else {
        fruit.mesh.material.dispose()
      }
    })
    this.effects.forEach((effect) => {
      this.scene.remove(effect.object)
      effect.object.geometry.dispose()
      effect.material.dispose()
    })
    this.renderer.dispose()
  }

  handleGesture(gesture: GestureEvent) {
    const candidate = this.pickGestureTarget(gesture)
    if (!candidate) return
    this.sliceFruit(candidate, gesture)
  }

  private tick = () => {
    const now = performance.now()
    const delta = (now - this.lastTime) / 1000
    this.lastTime = now
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  private update(delta: number) {
    this.spawnAccumulator += delta
    if (this.spawnAccumulator >= 1.2) {
      this.spawnAccumulator = Math.random() * 0.4
      this.spawnFruit()
    }
    this.updateFruits(delta)
    this.updateEffects(delta)
  }

  private updateFruits(delta: number) {
    this.fruits = this.fruits.filter((fruit) => {
      fruit.velocity.addScaledVector(GRAVITY, delta)
      fruit.mesh.position.addScaledVector(fruit.velocity, delta)
      fruit.mesh.rotation.x += fruit.spin.x * delta
      fruit.mesh.rotation.y += fruit.spin.y * delta
      fruit.mesh.rotation.z += fruit.spin.z * delta
      const alive = fruit.mesh.position.y > -1.5
      if (!alive) {
        this.scene.remove(fruit.mesh)
        fruit.mesh.geometry.dispose()
        ;(fruit.mesh.material as THREE.Material).dispose()
      }
      return alive
    })
  }

  private updateEffects(delta: number) {
    this.effects = this.effects.filter((effect) => {
      effect.elapsed += delta
      const progress = effect.elapsed / effect.lifespan
      effect.material.opacity = Math.max(1 - progress, 0)
      effect.object.scale.setScalar(1 + progress * 1.5)
      if (effect.elapsed >= effect.lifespan) {
        this.scene.remove(effect.object)
        effect.object.geometry.dispose()
        effect.material.dispose()
        return false
      }
      return true
    })
  }

  private spawnFruit() {
    const radius = THREE.MathUtils.randFloat(0.18, 0.28)
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
      roughness: 0.4,
      metalness: 0.1,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    const startX = THREE.MathUtils.randFloatSpread(1.5)
    mesh.position.set(startX, -1.2, THREE.MathUtils.randFloat(-0.5, 0.5))
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.4, 0.4),
      THREE.MathUtils.randFloat(2.2, 3.4),
      THREE.MathUtils.randFloat(-0.2, 0.2),
    )
    const spin = new THREE.Vector3(
      THREE.MathUtils.randFloat(-2, 2),
      THREE.MathUtils.randFloat(-2, 2),
      THREE.MathUtils.randFloat(-2, 2),
    )

    this.fruits.push({
      id: THREE.MathUtils.generateUUID(),
      mesh,
      velocity,
      spin,
      createdAt: performance.now(),
    })
  }

  private pickGestureTarget(gesture: GestureEvent) {
    if (!this.fruits.length) return null
    const maxDistance = 0.18
    let best: { fruit: FruitBody; distance: number } | null = null
    this.fruits.forEach((fruit) => {
      const screen = this.projectToScreen(fruit)
      const dx = screen.x - gesture.origin.x
      const dy = screen.y - gesture.origin.y
      const distance = Math.hypot(dx, dy)
      if (distance > maxDistance) return
      if (!best || distance < best.distance) {
        best = { fruit, distance }
      }
    })
    return best?.fruit ?? null
  }

  private projectToScreen(fruit: FruitBody) {
    this.projectionHelper.copy(fruit.mesh.position)
    this.projectionHelper.project(this.camera)
    return {
      x: (this.projectionHelper.x + 1) / 2,
      y: (1 - this.projectionHelper.y) / 2,
    }
  }

  private sliceFruit(fruit: FruitBody, gesture: GestureEvent) {
    this.createBurst(fruit.mesh.position.clone(), gesture)
    this.scene.remove(fruit.mesh)
    this.fruits = this.fruits.filter((f) => f.id !== fruit.id)
    fruit.mesh.geometry.dispose()
    ;(fruit.mesh.material as THREE.Material).dispose()
  }

  private createBurst(origin: THREE.Vector3, gesture: GestureEvent) {
    const particles = 24
    const positions = new Float32Array(particles * 3)
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2
      const radius = THREE.MathUtils.randFloat(0.05, 0.25)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = THREE.MathUtils.randFloat(-0.05, 0.05)
      positions[i * 3] = origin.x + x
      positions[i * 3 + 1] = origin.y + y
      positions[i * 3 + 2] = origin.z + z
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      size: 0.05 + gesture.strength * 0.05,
      color: gesture.hand === 'Left' ? 0x7dd3fc : 0xf472b6,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    this.scene.add(points)
    this.effects.push({
      object: points,
      elapsed: 0,
      lifespan: 0.6,
      material,
    })
  }

  private handleResize = () => {
    const { clientWidth, clientHeight } = this.canvas
    if (clientWidth === 0 || clientHeight === 0) return
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight, false)
  }
}

