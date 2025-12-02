import { create } from 'zustand';
const noop = (label) => () => console.warn(`[gameStore placeholder] ${label} not implemented yet`);
export const useGameStore = create(() => ({
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
