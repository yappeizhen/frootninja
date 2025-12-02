export type Vec3 = [number, number, number];
export declare const smoothPoint: (prev: Vec3 | null, next: Vec3, factor?: number) => Vec3;
export declare const computeVelocity: (points: Vec3[], delta?: number) => number;
export declare const normalizeLandmark: (x: number, y: number) => Vec3;
