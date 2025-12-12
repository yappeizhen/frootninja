/**
 * Seeded Random Number Generator
 * Uses Linear Congruential Generator (LCG) algorithm
 * Ensures both players see identical fruit spawns with same seed
 */
export class SeededRNG {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0 // Ensure unsigned 32-bit
  }

  /**
   * Generate next random number in [0, 1)
   */
  next(): number {
    // LCG parameters (same as glibc)
    this.seed = ((this.seed * 1103515245 + 12345) & 0x7fffffff) >>> 0
    return this.seed / 0x7fffffff
  }

  /**
   * Generate random integer in [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Generate random float in [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }

  /**
   * Generate random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability
  }

  /**
   * Get current seed value (for sync verification)
   */
  getSeed(): number {
    return this.seed
  }

  /**
   * Reset to a new seed
   */
  reset(seed: number): void {
    this.seed = seed >>> 0
  }
}

/**
 * Generate a random seed for room creation
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

