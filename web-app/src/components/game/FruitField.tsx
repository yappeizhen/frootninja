import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { useGameStore } from '../../state/useGameStore'
import type { Fruit } from '../../state/useGameStore'
import './FruitField.css'

export const FruitField = () => {
  const fruits = useGameStore((state) => state.fruits)

  return (
    <div className="fruit-field">
      <Canvas camera={{ position: [0, 0.5, 5], fov: 50 }}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          {fruits.map((fruit) => (
            <FruitMesh key={fruit.id} fruit={fruit} />
          ))}
        </Suspense>
        <GroundHelper />
      </Canvas>
      {fruits.length === 0 && <p className="fruit-field__empty">Waiting for fruits...</p>}
    </div>
  )
}

const FruitMesh = ({ fruit }: { fruit: Fruit }) => {
  const color = useMemo(() => (fruit.sliced ? '#fb7185' : '#4ade80'), [fruit.sliced])
  return (
    <mesh position={fruit.position} scale={fruit.sliced ? 0.9 : 1}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  )
}

const GroundHelper = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
    <planeGeometry args={[10, 10]} />
    <meshStandardMaterial color="#111" />
  </mesh>
)

