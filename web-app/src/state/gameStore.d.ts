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
export declare const useGameStore: import("zustand").UseBoundStore<import("zustand").StoreApi<GameState>>;
export {};
