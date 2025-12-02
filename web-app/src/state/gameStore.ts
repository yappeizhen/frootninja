import { create } from 'zustand';

type Vector3 = [number, number, number];

export type Fruit = {
  id: string;
  type: string;
  position: Vector3;
  velocity: Vector3;
  radius: number;
  sliced: boolean;
};

export type GestureTrail = {
  id: string;
  points: Vector3[];
  velocity: number;
};

type GameState = {
  fruits: Fruit[];
  score: number;
  combo: number;
  lives: number;
  gestureTrails: GestureTrail[];
  spawnWave: () => void;
  updateFrame: (delta: number) => void;
  registerGesture: (trail: GestureTrail) => void;
  clearTrails: () => void;
};

const noop = (label: string) => () =>
  console.warn(`[gameStore placeholder] ${label} not implemented yet`);

export const useGameStore = create<GameState>(() => ({
  fruits: [],
  score: 0,
  combo: 0,
  lives: 3,
  gestureTrails: [],
  spawnWave: noop('spawnWave'),
  updateFrame: noop('updateFrame'),
  registerGesture: noop('registerGesture'),
  clearTrails: noop('clearTrails')
}));

