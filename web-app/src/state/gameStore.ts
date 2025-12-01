import { create } from 'zustand';

export type FruitType = 'citrus' | 'berry' | 'melon' | 'bomb';

export type Fruit = {
  id: string;
  type: FruitType;
  position: [number, number, number];
  velocity: [number, number, number];
  sliced: boolean;
  radius: number;
};

export type GestureTrail = {
  id: string;
  points: Array<[number, number, number]>;
  velocity: number;
};

type GameState = {
  fruits: Fruit[];
  score: number;
  lives: number;
  combo: number;
  gestureTrails: GestureTrail[];
  spawnWave: () => void;
  updateFrame: (delta: number) => void;
  registerGesture: (trail: GestureTrail) => void;
  clearTrails: () => void;
};

const GRAVITY = -14;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const randomFruit = (): Fruit => {
  const catalog: FruitType[] = ['citrus', 'berry', 'melon'];
  const type = catalog[Math.floor(Math.random() * catalog.length)];
  const radius = type === 'melon' ? 0.32 : type === 'berry' ? 0.18 : 0.24;

  return {
    id: createId(),
    type,
    radius,
    sliced: false,
    position: [
      (Math.random() - 0.5) * 4,
      -3 - Math.random(),
      -3 + Math.random() * 2
    ],
    velocity: [Math.random() - 0.5, 10 + Math.random() * 4, 0]
  };
};

const detectCollision = (fruit: Fruit, trail: GestureTrail) => {
  return trail.points.some(([x, y]) => {
    const dx = x - fruit.position[0];
    const dy = y - fruit.position[1];
    const distance = Math.hypot(dx, dy);
    return distance < fruit.radius * 1.2 && trail.velocity > 1.5;
  });
};

export const useGameStore = create<GameState>((set, get) => ({
  fruits: Array.from({ length: 4 }, randomFruit),
  score: 0,
  combo: 0,
  lives: 3,
  gestureTrails: [],
  spawnWave: () =>
    set((state) => ({
      fruits: [...state.fruits, ...Array.from({ length: 3 }, randomFruit)]
    })),
  registerGesture: (trail) =>
    set((state) => {
      const fruits = state.fruits.map((fruit) => {
        if (fruit.sliced || !detectCollision(fruit, trail)) {
          return fruit;
        }
        return { ...fruit, sliced: true };
      });

      const sliced = fruits.filter((f) => f.sliced).length;

      return {
        fruits,
        score: state.score + sliced * 10,
        combo: sliced ? state.combo + 1 : 0,
        gestureTrails: [...state.gestureTrails, trail]
      };
    }),
  clearTrails: () => set({ gestureTrails: [] }),
  updateFrame: (delta) =>
    set((state) => {
      const fruits = state.fruits
        .map((fruit) => {
          const velocity = [
            fruit.velocity[0],
            fruit.velocity[1] + GRAVITY * delta,
            fruit.velocity[2]
          ] as Fruit['velocity'];

          const position = [
            fruit.position[0] + velocity[0] * delta,
            fruit.position[1] + velocity[1] * delta,
            fruit.position[2] + velocity[2] * delta
          ] as Fruit['position'];

          return { ...fruit, position, velocity };
        })
        .filter((fruit) => fruit.position[1] > -6);

      const lost = state.fruits.length - fruits.length;

      return {
        fruits: fruits.length < 3 ? [...fruits, randomFruit()] : fruits,
        lives: state.lives - lost,
        gestureTrails: state.gestureTrails.slice(-4)
      };
    })
}));

