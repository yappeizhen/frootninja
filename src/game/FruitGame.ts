import * as THREE from 'three'
import type { GestureEvent } from '@/types'

const GRAVITY = new THREE.Vector3(0, -8.0, 0)

type FruitType = 'strawberry' | 'orange' | 'apple' | 'watermelon' | 'grape' | 'lemon' | 'kiwi'

interface FruitConfig {
  type: FruitType
  outerColor: number
  innerColor: number
  scale: THREE.Vector3
  geometry: THREE.BufferGeometry
}

interface FruitBody {
  id: string
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  createdAt: number
  outerColor: number
  innerColor: number
  initialScale: THREE.Vector3
  type: FruitType
}

interface SliceHalf {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  life: number
}

interface JuiceParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  life: number
}

interface SliceEffect {
  halves: SliceHalf[]
  juiceParticles: JuiceParticle[]
  juiceMesh: THREE.InstancedMesh
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
  private sphereGeo = new THREE.SphereGeometry(1, 32, 32)
  private halfSphereGeo: THREE.BufferGeometry
  private strawberryGeo: THREE.BufferGeometry
  private juiceGeo = new THREE.SphereGeometry(1, 8, 8)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    
    // Create half sphere geometry for sliced fruit
    this.halfSphereGeo = this.createHalfSphere()
    
    // Create strawberry-like geometry
    this.strawberryGeo = this.createStrawberryGeometry()
    
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

    // Bright, cheerful lighting for fruits
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(5, 8, 5)
    this.scene.add(keyLight)
    
    // Soft fill light
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.4)
    fillLight.position.set(-3, 2, 3)
    this.scene.add(fillLight)

    // Rim light for that juicy glow
    const rimLight = new THREE.PointLight(0xffaacc, 0.8, 10)
    rimLight.position.set(0, 0, 3)
    this.scene.add(rimLight)

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  }

  private createHalfSphere(): THREE.BufferGeometry {
    const geo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    geo.rotateX(Math.PI / 2)
    return geo
  }

  private createStrawberryGeometry(): THREE.BufferGeometry {
    // Cone with rounded top for strawberry shape
    const geo = new THREE.ConeGeometry(0.7, 1.2, 16)
    geo.translate(0, 0.1, 0)
    return geo
  }

  private createFruitMaterial(color: number, isInner: boolean = false): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: isInner ? 0.35 : 0.12,
      metalness: 0.05,
      clearcoat: isInner ? 0.4 : 0.9,
      clearcoatRoughness: 0.08,
      reflectivity: 1.0,
      emissive: color,
      emissiveIntensity: isInner ? 0.25 : 0.12,
      transmission: isInner ? 0.1 : 0.25,
      thickness: 0.8,
      ior: 1.5,
    })
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
      ;(fruit.mesh.material as THREE.Material).dispose()
    })
    this.effects.forEach((effect) => {
      effect.halves.forEach(h => {
        this.scene.remove(h.mesh)
        ;(h.mesh.material as THREE.Material).dispose()
      })
      this.scene.remove(effect.juiceMesh)
      effect.juiceMesh.dispose()
    })
    this.sphereGeo.dispose()
    this.halfSphereGeo.dispose()
    this.strawberryGeo.dispose()
    this.juiceGeo.dispose()
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
    if (this.spawnAccumulator >= 1.0) {
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
      
      fruit.mesh.rotation.x += fruit.spin.x * delta
      fruit.mesh.rotation.y += fruit.spin.y * delta
      fruit.mesh.rotation.z += fruit.spin.z * delta

      // Smooth scale-in animation
      const age = (performance.now() - fruit.createdAt) / 1000
      if (age < 0.4) {
        const t = this.easeOutBack(age / 0.4)
        fruit.mesh.scale.copy(fruit.initialScale).multiplyScalar(t)
      }

      const alive = fruit.mesh.position.y > -2.5
      if (!alive) {
        this.scene.remove(fruit.mesh)
        ;(fruit.mesh.material as THREE.Material).dispose()
      }
      return alive
    })
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  }

  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3)
  }

  private updateEffects(delta: number) {
    this.effects = this.effects.filter((effect) => {
      effect.elapsed += delta
      const progress = effect.elapsed / effect.lifespan
      
      if (progress >= 1) {
        effect.halves.forEach(h => {
          this.scene.remove(h.mesh)
          ;(h.mesh.material as THREE.Material).dispose()
        })
        this.scene.remove(effect.juiceMesh)
        effect.juiceMesh.dispose()
        return false
      }

      // Update slice halves
      effect.halves.forEach(half => {
        half.velocity.addScaledVector(GRAVITY, delta)
        half.mesh.position.addScaledVector(half.velocity, delta)
        half.mesh.rotation.x += half.spin.x * delta
        half.mesh.rotation.y += half.spin.y * delta
        half.mesh.rotation.z += half.spin.z * delta
        
        // Fade out
        const mat = half.mesh.material as THREE.MeshStandardMaterial
        mat.opacity = 1 - this.easeOutCubic(progress)
        mat.transparent = true
      })

      // Update juice particles
      const dummy = new THREE.Object3D()
      effect.juiceParticles.forEach((p, i) => {
        p.velocity.addScaledVector(GRAVITY, delta * 0.5)
        p.position.addScaledVector(p.velocity, delta)
        p.velocity.multiplyScalar(0.96)
        
        dummy.position.copy(p.position)
        const scale = p.scale * (1 - progress * 0.8)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        effect.juiceMesh.setMatrixAt(i, dummy.matrix)
      })
      effect.juiceMesh.instanceMatrix.needsUpdate = true

      return true
    })
  }

  private spawnFruit() {
    const config = this.getRandomFruitConfig()
    
    const material = this.createFruitMaterial(config.outerColor)
    const mesh = new THREE.Mesh(config.geometry, material)
    mesh.scale.copy(config.scale)
    
    const startX = THREE.MathUtils.randFloatSpread(1.8)
    mesh.position.set(startX, -1.5, THREE.MathUtils.randFloat(-0.3, 0.3))
    this.scene.add(mesh)

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(-0.4, 0.4),
      THREE.MathUtils.randFloat(5.5, 7.0),
      THREE.MathUtils.randFloat(-0.15, 0.15),
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
      outerColor: config.outerColor,
      innerColor: config.innerColor,
      initialScale: config.scale.clone(),
      type: config.type
    })
  }

  private getRandomFruitConfig(): FruitConfig {
    const types: FruitType[] = ['strawberry', 'orange', 'apple', 'watermelon', 'grape', 'lemon', 'kiwi']
    const type = types[Math.floor(Math.random() * types.length)]

    switch (type) {
      case 'strawberry':
        return {
          type,
          outerColor: 0xc41e3a,  // Deep crimson red
          innerColor: 0xff6b8a,  // Rose pink inside
          geometry: this.strawberryGeo,
          scale: new THREE.Vector3(0.25, 0.25, 0.25),
        }
      case 'orange':
        return {
          type,
          outerColor: 0xe65c00,  // Deep orange
          innerColor: 0xffb347,  // Rich amber inside
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.28, 0.28, 0.28),
        }
      case 'apple':
        return {
          type,
          outerColor: 0x8b0000,  // Dark red
          innerColor: 0xfff8dc,  // Cornsilk inside
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.26, 0.26, 0.26),
        }
      case 'watermelon':
        return {
          type,
          outerColor: 0x1a4d1a,  // Deep forest green
          innerColor: 0xe63950,  // Deep pink flesh
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.24, 0.32, 0.24),
        }
      case 'grape':
        return {
          type,
          outerColor: 0x4a1259,  // Deep purple
          innerColor: 0xc9a0dc,  // Soft lavender inside
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.18, 0.18, 0.18),
        }
      case 'lemon':
        return {
          type,
          outerColor: 0xe6c200,  // Deep golden yellow
          innerColor: 0xfff59d,  // Soft lemon inside
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.22, 0.26, 0.22),
        }
      case 'kiwi':
        return {
          type,
          outerColor: 0x5c4033,  // Deep brown
          innerColor: 0x6bbf59,  // Vibrant green inside
          geometry: this.sphereGeo,
          scale: new THREE.Vector3(0.2, 0.24, 0.2),
        }
    }
  }

  private pickGestureTarget(gesture: GestureEvent): FruitBody | null {
    if (!this.fruits.length) return null
    const maxDistance = 0.28
    let bestFruit: FruitBody | null = null
    let bestDistance = Infinity
    for (const fruit of this.fruits) {
      const screen = this.projectToScreen(fruit)
      const dx = screen.x - gesture.origin.x
      const dy = screen.y - gesture.origin.y
      const distance = Math.hypot(dx, dy)
      if (distance > maxDistance) continue
      if (distance < bestDistance) {
        bestFruit = fruit
        bestDistance = distance
      }
    }
    return bestFruit
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
    const origin = fruit.mesh.position.clone()
    const scale = fruit.initialScale.clone()
    
    // Create slice effect
    this.createSliceEffect(origin, scale, fruit.outerColor, fruit.innerColor, gesture, fruit.velocity.clone())
    
    // Remove original fruit
    this.scene.remove(fruit.mesh)
    ;(fruit.mesh.material as THREE.Material).dispose()
    this.fruits = this.fruits.filter((f) => f.id !== fruit.id)
  }

  private createSliceEffect(
    origin: THREE.Vector3, 
    scale: THREE.Vector3, 
    outerColor: number, 
    innerColor: number,
    gesture: GestureEvent,
    fruitVelocity: THREE.Vector3
  ) {
    const halves: SliceHalf[] = []
    
    // Slice direction based on gesture
    const sliceAngle = Math.atan2(gesture.direction.y, gesture.direction.x)
    
    // Create two halves
    for (let i = 0; i < 2; i++) {
      // Inner face (shows fruit inside)
      const innerMat = this.createFruitMaterial(innerColor, true)
      const halfMesh = new THREE.Mesh(this.halfSphereGeo, innerMat)
      
      // Outer shell
      const outerMat = this.createFruitMaterial(outerColor)
      const outerMesh = new THREE.Mesh(this.halfSphereGeo, outerMat)
      outerMesh.rotation.x = Math.PI
      halfMesh.add(outerMesh)
      
      halfMesh.scale.copy(scale)
      halfMesh.position.copy(origin)
      
      // Rotate based on slice direction
      halfMesh.rotation.z = sliceAngle + (i === 0 ? 0 : Math.PI)
      
      // Split velocity
      const splitDir = i === 0 ? 1 : -1
      const splitSpeed = 2.5
      const velocity = fruitVelocity.clone()
      velocity.x += Math.cos(sliceAngle + Math.PI / 2) * splitDir * splitSpeed
      velocity.y += Math.sin(sliceAngle + Math.PI / 2) * splitDir * splitSpeed + 2
      velocity.z += THREE.MathUtils.randFloat(-0.5, 0.5)
      
      const spin = new THREE.Vector3(
        THREE.MathUtils.randFloat(-8, 8),
        THREE.MathUtils.randFloat(-8, 8),
        THREE.MathUtils.randFloat(-4, 4),
      )

      this.scene.add(halfMesh)
      halves.push({ mesh: halfMesh, velocity, spin, life: 0 })
    }
    
    // Create juice particles
    const juiceCount = 20
    const juiceMat = new THREE.MeshBasicMaterial({
      color: innerColor,
      transparent: true,
      opacity: 0.8,
    })
    const juiceMesh = new THREE.InstancedMesh(this.juiceGeo, juiceMat, juiceCount)
    
    const juiceParticles: JuiceParticle[] = []
    for (let i = 0; i < juiceCount; i++) {
      const angle = THREE.MathUtils.randFloat(0, Math.PI * 2)
      const speed = THREE.MathUtils.randFloat(3, 7)
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed * 0.6 + 3,
        THREE.MathUtils.randFloat(-1, 1)
      )
      
      juiceParticles.push({
        position: origin.clone().add(new THREE.Vector3(
          THREE.MathUtils.randFloat(-0.1, 0.1),
          THREE.MathUtils.randFloat(-0.1, 0.1),
          THREE.MathUtils.randFloat(-0.1, 0.1)
        )),
        velocity,
        scale: THREE.MathUtils.randFloat(0.02, 0.06),
        life: 0
      })
    }
    
    this.scene.add(juiceMesh)

    this.effects.push({
      halves,
      juiceParticles,
      juiceMesh,
      elapsed: 0,
      lifespan: 1.2
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
