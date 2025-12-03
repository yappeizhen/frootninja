import * as THREE from 'three'
import type { GestureEvent } from '@/types'

const GRAVITY = new THREE.Vector3(0, -8.0, 0)

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
  rotation: THREE.Vector3
  spin: THREE.Vector3
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
  private sphereGeo = new THREE.SphereGeometry(1, 48, 48) // Very smooth
  private coneGeo = new THREE.ConeGeometry(1, 2, 48)
  private shardGeo = new THREE.TetrahedronGeometry(1, 0) // Sharp shards
  
  // Sophisticated Chrome/Glass Material
  private chromeMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.1,
    metalness: 0.9,
    transmission: 0.1, // Slight glassiness
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0,
    iridescence: 0.3,
    iridescenceIOR: 1.5,
    side: THREE.DoubleSide,
  })

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 1.5, 4)
    this.camera.lookAt(0, 1, 0)

    // High Contrast Lighting (Cyberpunk/Studio)
    this.scene.add(new THREE.AmbientLight(0x111111, 1.0)) // Very dark ambient
    
    const mainLight = new THREE.RectAreaLight(0xffffff, 5.0, 10, 10)
    mainLight.position.set(5, 5, 5)
    mainLight.lookAt(0, 0, 0)
    this.scene.add(mainLight)
    
    const rimLight1 = new THREE.SpotLight(0xff00ff, 10.0) // Neon Pink Rim
    rimLight1.position.set(-5, 2, -5)
    rimLight1.lookAt(0, 0, 0)
    this.scene.add(rimLight1)

    const rimLight2 = new THREE.SpotLight(0x00ffff, 5.0) // Cyan Rim
    rimLight2.position.set(5, -2, -5)
    rimLight2.lookAt(0, 0, 0)
    this.scene.add(rimLight2)

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  start() {
    if (this.animationHandle) return
    this.lastTime = performance.now()
    this.renderer.setAnimationLoop(this.tick)
    this.animationHandle = 1
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
    this.chromeMaterial.dispose()
    this.sphereGeo.dispose()
    this.coneGeo.dispose()
    this.shardGeo.dispose()
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
    const delta = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  private update(delta: number) {
    this.spawnAccumulator += delta
    if (this.spawnAccumulator >= 1.0) { // Faster, intense action
      this.spawnAccumulator = Math.random() * 0.3
      this.spawnFruit()
    }
    this.updateFruits(delta)
    this.updateEffects(delta)
  }

  private updateFruits(delta: number) {
    this.fruits = this.fruits.filter((fruit) => {
      fruit.velocity.addScaledVector(GRAVITY, delta)
      fruit.mesh.position.addScaledVector(fruit.velocity, delta)
      
      // Fast, sharp spins
      fruit.mesh.rotation.x += fruit.spin.x * delta
      fruit.mesh.rotation.y += fruit.spin.y * delta
      fruit.mesh.rotation.z += fruit.spin.z * delta

      // Slick ease-out
      const age = (performance.now() - fruit.createdAt) / 1000
      if (age < 0.4) {
        const scale = THREE.MathUtils.lerp(0, 1, this.easeOutQuart(age / 0.4))
        fruit.mesh.scale.copy(fruit.initialScale).multiplyScalar(scale)
      }

      const alive = fruit.mesh.position.y > -2.5
      if (!alive) {
        this.scene.remove(fruit.mesh)
      }
      return alive
    })
  }

  private easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4)
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
        p.velocity.addScaledVector(GRAVITY, delta)
        p.position.addScaledVector(p.velocity, delta)
        p.velocity.multiplyScalar(0.98) // Minimal drag for sharp movement
        
        p.rotation.addScaledVector(p.spin, delta)

        dummy.position.copy(p.position)
        dummy.rotation.setFromVector3(p.rotation)
        
        // Sharp fade out
        const scale = p.scale * (1 - progress)
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
    
    const material = this.chromeMaterial.clone()
    material.color.setHex(config.color)
    material.emissive.setHex(config.color)
    material.emissiveIntensity = 0.2
    
    const mesh = new THREE.Mesh(config.geometry, material)
    mesh.scale.copy(config.scale)
    mesh.castShadow = true
    
    const startX = THREE.MathUtils.randFloatSpread(1.8)
    mesh.position.set(startX, -1.5, THREE.MathUtils.randFloat(-0.5, 0.5))
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.6, 0.6),
      THREE.MathUtils.randFloat(6.0, 7.5),
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

    // High Contrast Black-Pink Palette
    switch (type) {
      case 'strawberry':
        return {
          type,
          color: 0xff0055, // Intense Pink/Red
          geometry: this.coneGeo,
          scale: new THREE.Vector3(0.22, 0.22, 0.22),
        }
      case 'blackberry':
        return {
          type,
          color: 0x000000, // Pure Black (Chrome will handle reflection)
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.2, 0.2, 0.2),
        }
      case 'dragonfruit':
        return {
          type,
          color: 0xff00ff, // Neon Magenta
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.24, 0.3, 0.24),
        }
      case 'apple':
        return {
          type,
          color: 0x111111, // Dark Graphite
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.26, 0.26, 0.26),
        }
      case 'watermelon':
        return {
          type,
          color: 0xff3366, // Hot Pink
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.22, 0.32, 0.22),
        }
    }
  }

  private pickGestureTarget(gesture: GestureEvent) {
    if (!this.fruits.length) return null
    const maxDistance = 0.25
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

  private sliceFruit(fruit: FruitBody, _gesture: GestureEvent) {
    this.createShardExplosion(fruit.mesh.position.clone(), fruit.color)
    this.scene.remove(fruit.mesh)
    this.fruits = this.fruits.filter((f) => f.id !== fruit.id)
    ;(fruit.mesh.material as THREE.Material).dispose()
  }

  private createShardExplosion(origin: THREE.Vector3, color: number) {
    const particleCount = 24
    const material = this.chromeMaterial.clone()
    material.color.setHex(color)
    material.emissive.setHex(0xffffff) // Flash bright
    material.emissiveIntensity = 1.0
    
    const mesh = new THREE.InstancedMesh(this.shardGeo, material, particleCount)
    
    const particles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      const angle = THREE.MathUtils.randFloat(0, Math.PI * 2)
      const speed = THREE.MathUtils.randFloat(2, 6)
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        THREE.MathUtils.randFloat(-2, 2)
      )
      
      particles.push({
        position: origin.clone(),
        velocity,
        scale: THREE.MathUtils.randFloat(0.05, 0.15),
        rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        spin: new THREE.Vector3(
            Math.random() - 0.5, 
            Math.random() - 0.5, 
            Math.random() - 0.5
        ).multiplyScalar(15), // Fast spin
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
