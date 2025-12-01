import { describe, expect, it } from 'vitest';

import { computeVelocity, smoothPoint } from '@/utils/smoothing';

describe('smoothing utilities', () => {
  it('smoothPoint eases toward the next point', () => {
    const prev: [number, number, number] = [0, 0, 0];
    const next: [number, number, number] = [1, 1, 0];
    const result = smoothPoint(prev, next, 0.5);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(0.5);
  });

  it('computeVelocity returns 0 for insufficient points', () => {
    expect(computeVelocity([[0, 0, 0]])).toBe(0);
  });

  it('computeVelocity increases with distance', () => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0]
    ];
    expect(computeVelocity(points, 0.1)).toBeGreaterThan(5);
  });
});

