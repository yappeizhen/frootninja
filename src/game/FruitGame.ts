import * as THREE from 'three'
import type { GestureEvent } from '@/types'

const GRAVITY = new THREE.Vector3(0, -8.0, 0)

type FruitType = 'strawberry' | 'banana' | 'green-apple' | 'apple' | 'watermelon' | 'blackberry' | 'dragonfruit'

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
  private sphereGeo = new THREE.SphereGeometry(1, 48, 48)
  private coneGeo = new THREE.ConeGeometry(1, 2, 48)
  private bananaGeo = new THREE.CapsuleGeometry(0.6, 2, 4, 16)
  private shardGeo = new THREE.TetrahedronGeometry(1, 0) // Sharp shards for crystals
  
  // Dark Crystal / Gemstone Material
  private crystalMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.05,
    metalness: 0.1, // Less metal, more glass
    transmission: 0.6, // See-through
    thickness: 1.5, // Volume
    ior: 1.5, // Refraction
    clearcoat: 1.0,
    attenuationColor: new THREE.Color(0xffffff),
    attenuationDistance: 1.0,
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
    this.renderer.toneMappingExposure = 1.0
    
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 1.5, 4)
    this.camera.lookAt(0, 1, 0)

    // Moody, Gothic Lighting
    this.scene.add(new THREE.AmbientLight(0x220033, 0.8)) // Deep purple ambient
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
    keyLight.position.set(5, 5, 5)
    this.scene.add(keyLight)
    
    // Accent Lights (Gold & Purple)
    const rimLight1 = new THREE.SpotLight(0xffd700, 8.0) // Gold Rim
    rimLight1.position.set(-5, 2, -5)
    rimLight1.lookAt(0, 0, 0)
    this.scene.add(rimLight1)

    const rimLight2 = new THREE.SpotLight(0x9966cc, 5.0) // Amethyst Rim
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
    this.crystalMaterial.dispose()
    this.sphereGeo.dispose()
    this.coneGeo.dispose()
    this.bananaGeo.dispose()
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
    if (this.spawnAccumulator >= 1.2) { // Slightly slower, elegant spawn
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

      const age = (performance.now() - fruit.createdAt) / 1000
      if (age < 0.5) {
        const scale = THREE.MathUtils.lerp(0, 1, this.easeOutCubic(age / 0.5))
        fruit.mesh.scale.copy(fruit.initialScale).multiplyScalar(scale)
      }

      const alive = fruit.mesh.position.y > -2.5
      if (!alive) {
        this.scene.remove(fruit.mesh)
      }
      return alive
    })
  }

  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3)
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
        p.velocity.multiplyScalar(0.98) 
        
        p.rotation.addScaledVector(p.spin, delta)

        dummy.position.copy(p.position)
        dummy.rotation.setFromVector3(p.rotation)
        
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
    
    const material = this.crystalMaterial.clone()
    material.color.setHex(config.color)
    material.attenuationColor.setHex(config.color) // Deep internal color
    
    const mesh = new THREE.Mesh(config.geometry, material)
    mesh.scale.copy(config.scale)
    mesh.castShadow = true
    
    const startX = THREE.MathUtils.randFloatSpread(1.8)
    mesh.position.set(startX, -1.5, THREE.MathUtils.randFloat(-0.5, 0.5))
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.5, 0.5),
      THREE.MathUtils.randFloat(5.5, 7.0),
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
      color: config.color,
      initialScale: config.scale.clone()
    })
  }

  private getRandomFruitConfig(): FruitConfig {
    const types: FruitType[] = ['strawberry', 'banana', 'green-apple', 'apple', 'watermelon', 'blackberry', 'dragonfruit']
    const type = types[Math.floor(Math.random() * types.length)]

    // Gemstone / Jewel Palette
    switch (type) {
      case 'strawberry':
        return {
          type,
          color: 0xe0115f, // Ruby
          geometry: this.coneGeo,
          scale: new THREE.Vector3(0.22, 0.22, 0.22),
        }
      case 'banana':
        return {
          type,
          color: 0xffe135, // Topaz / Gold
          geometry: this.bananaGeo,
          scale: new THREE.Vector3(0.12, 0.12, 0.12),
        }
      case 'green-apple':
        return {
          type,
          color: 0x50c878, // Emerald
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.24, 0.24, 0.24),
        }
      case 'apple':
        return {
          type,
          color: 0x9a2a2a, // Garnet
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.26, 0.26, 0.26),
        }
      case 'watermelon':
        return {
          type,
          color: 0xff69b4, // Pink Tourmaline
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.22, 0.32, 0.22),
        }
      case 'blackberry':
        return {
          type,
          color: 0x4b0082, // Indigo / Obsidian
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.2, 0.2, 0.2),
        }
      case 'dragonfruit':
        return {
          type,
          color: 0x9966cc, // Amethyst
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.24, 0.3, 0.24),
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
    this.createCrystalExplosion(fruit.mesh.position.clone(), fruit.color)
    this.scene.remove(fruit.mesh)
    this.fruits = this.fruits.filter((f) => f.id !== fruit.id)
    ;(fruit.mesh.material as THREE.Material).dispose()
  }

  private createCrystalExplosion(origin: THREE.Vector3, color: number) {
    const particleCount = 24
    const material = this.crystalMaterial.clone()
    material.color.setHex(color)
    material.emissive.setHex(0xffffff)
    material.emissiveIntensity = 0.8
    
    const mesh = new THREE.InstancedMesh(this.shardGeo, material, particleCount)
    
    const particles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      const angle = THREE.MathUtils.randFloat(0, Math.PI * 2)
      const speed = THREE.MathUtils.randFloat(2, 5)
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
        ).multiplyScalar(10),
        life: 0,
        maxLife: 1.0
      })
    }

    this.scene.add(mesh)
    this.effects.push({
      mesh,
      particles,
      elapsed: 0,
      lifespan: 1.0
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
