import * as THREE from 'three'
import type { GestureEvent } from '@/types'

const GRAVITY = new THREE.Vector3(0, -8.0, 0) // Increased gravity for snappier feel

type FruitType = 'strawberry' | 'blackberry' | 'dragonfruit' | 'apple' | 'watermelon'

interface FruitConfig {
  type: FruitType
  color: number
  scale: THREE.Vector3
  geometry: THREE.BufferGeometry
}

interface FruitBody {
  id: string
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  createdAt: number
  color: number
  initialScale: THREE.Vector3
}

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  life: number
  maxLife: number
}

interface SliceEffect {
  mesh: THREE.InstancedMesh
  particles: Particle[]
  elapsed: number
  lifespan: number
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

  // Shared Geometries
  private sphereGeo = new THREE.SphereGeometry(1, 16, 16)
  private coneGeo = new THREE.ConeGeometry(1, 2, 16)
  
  // Shared Material
  private gummyMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.2,
    transmission: 0.6,
    thickness: 1.5,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  })

  private particleGeometry = new THREE.SphereGeometry(0.04, 8, 8)

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

    // Lighting setup for gummy effect
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
    mainLight.position.set(5, 5, 5)
    this.scene.add(mainLight)
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0)
    backLight.position.set(-5, 5, -5)
    this.scene.add(backLight)

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
    })
    this.effects.forEach((effect) => {
      this.scene.remove(effect.mesh)
      effect.mesh.dispose()
    })
    this.gummyMaterial.dispose()
    this.sphereGeo.dispose()
    this.coneGeo.dispose()
    this.particleGeometry.dispose()
    this.renderer.dispose()
  }

  handleGesture(gesture: GestureEvent) {
    const candidate = this.pickGestureTarget(gesture)
    if (!candidate) return
    this.sliceFruit(candidate, gesture)
  }

  syncViewport() {
    this.handleResize()
  }

  private tick = () => {
    const now = performance.now()
    const delta = Math.min((now - this.lastTime) / 1000, 0.1) // Cap delta
    this.lastTime = now
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  private update(delta: number) {
    this.spawnAccumulator += delta
    if (this.spawnAccumulator >= 1.0) { // Slightly faster spawn
      this.spawnAccumulator = Math.random() * 0.3
      this.spawnFruit()
    }
    this.updateFruits(delta)
    this.updateEffects(delta)
  }

  private updateFruits(delta: number) {
    this.fruits = this.fruits.filter((fruit) => {
      // Physics
      fruit.velocity.addScaledVector(GRAVITY, delta)
      fruit.mesh.position.addScaledVector(fruit.velocity, delta)
      
      // Spin
      fruit.mesh.rotation.x += fruit.spin.x * delta
      fruit.mesh.rotation.y += fruit.spin.y * delta
      fruit.mesh.rotation.z += fruit.spin.z * delta

      // Entrance animation (pop in)
      const age = (performance.now() - fruit.createdAt) / 1000
      if (age < 0.3) {
        const scale = THREE.MathUtils.lerp(0, 1, this.easeOutBack(age / 0.3))
        fruit.mesh.scale.copy(fruit.initialScale).multiplyScalar(scale)
      }

      const alive = fruit.mesh.position.y > -2.0
      if (!alive) {
        this.scene.remove(fruit.mesh)
      }
      return alive
    })
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  }

  private updateEffects(delta: number) {
    this.effects = this.effects.filter((effect) => {
      effect.elapsed += delta
      const progress = effect.elapsed / effect.lifespan
      
      if (progress >= 1) {
        this.scene.remove(effect.mesh)
        effect.mesh.dispose()
        return false
      }

      const dummy = new THREE.Object3D()
      
      effect.particles.forEach((p, i) => {
        // Physics
        p.velocity.addScaledVector(GRAVITY, delta)
        p.position.addScaledVector(p.velocity, delta)
        
        // Drag
        p.velocity.multiplyScalar(0.98)

        // Update transform
        dummy.position.copy(p.position)
        const scale = p.scale * (1 - Math.pow(progress, 3)) // Non-linear fade out
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        
        effect.mesh.setMatrixAt(i, dummy.matrix)
      })
      
      effect.mesh.instanceMatrix.needsUpdate = true
      return true
    })
  }

  private spawnFruit() {
    const config = this.getRandomFruitConfig()
    
    // Clone material to allow unique colors while sharing properties
    const material = this.gummyMaterial.clone()
    material.color.setHex(config.color)
    
    const mesh = new THREE.Mesh(config.geometry, material)
    mesh.scale.copy(config.scale)
    mesh.castShadow = true
    
    const startX = THREE.MathUtils.randFloatSpread(1.8)
    mesh.position.set(startX, -1.5, THREE.MathUtils.randFloat(-0.5, 0.5))
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.6, 0.6),
      THREE.MathUtils.randFloat(5.5, 7.5), // Higher toss
      THREE.MathUtils.randFloat(-0.2, 0.2),
    )
    
    const spin = new THREE.Vector3(
      THREE.MathUtils.randFloat(-3, 3),
      THREE.MathUtils.randFloat(-3, 3),
      THREE.MathUtils.randFloat(-3, 3),
    )

    this.fruits.push({
      id: THREE.MathUtils.generateUUID(),
      mesh,
      velocity,
      spin,
      createdAt: performance.now(),
      color: config.color,
      initialScale: config.scale.clone()
    })
  }

  private getRandomFruitConfig(): FruitConfig {
    const types: FruitType[] = ['strawberry', 'blackberry', 'dragonfruit', 'apple', 'watermelon']
    const type = types[Math.floor(Math.random() * types.length)]

    switch (type) {
      case 'strawberry':
        return {
          type,
          color: 0xff4757,
          geometry: this.coneGeo, // Simple approximation
          scale: new THREE.Vector3(0.2, 0.2, 0.2), // Cones are tall
        }
      case 'blackberry':
        return {
          type,
          color: 0x2f3542,
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.18, 0.18, 0.18),
        }
      case 'dragonfruit':
        return {
          type,
          color: 0xff6b81,
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.22, 0.28, 0.22), // Elongated
        }
      case 'apple':
        return {
          type,
          color: 0x7bed9f,
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.24, 0.24, 0.24),
        }
      case 'watermelon':
        return {
          type,
          color: 0x2ed573,
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.2, 0.3, 0.2),
        }
    }
  }

  private pickGestureTarget(gesture: GestureEvent) {
    if (!this.fruits.length) return null
    const maxDistance = 0.25 // Slightly easier to hit
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
    this.createJuiceExplosion(fruit.mesh.position.clone(), fruit.color)
    this.scene.remove(fruit.mesh)
    this.fruits = this.fruits.filter((f) => f.id !== fruit.id)
    // Material is cloned per fruit, so dispose it
    ;(fruit.mesh.material as THREE.Material).dispose()
  }

  private createJuiceExplosion(origin: THREE.Vector3, color: number) {
    const particleCount = 20
    const material = this.gummyMaterial.clone()
    material.color.setHex(color)
    material.transparent = true
    material.opacity = 0.9
    
    const mesh = new THREE.InstancedMesh(this.particleGeometry, material, particleCount)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    
    const particles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      const angle = THREE.MathUtils.randFloat(0, Math.PI * 2)
      const speed = THREE.MathUtils.randFloat(1, 4)
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        THREE.MathUtils.randFloat(-1, 1)
      )
      
      particles.push({
        position: origin.clone(),
        velocity,
        scale: THREE.MathUtils.randFloat(0.5, 1.5),
        life: 0,
        maxLife: 0.8
      })
    }

    this.scene.add(mesh)
    this.effects.push({
      mesh,
      particles,
      elapsed: 0,
      lifespan: 0.8
    })
  }

  private handleResize = () => {
    const host = this.canvas.parentElement ?? this.canvas
    const { clientWidth, clientHeight } = host
    if (clientWidth === 0 || clientHeight === 0) return
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight, false)
  }
}
