/** Deterministic PRNG so repeated seeds produce identical demo data. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    },
    int(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(this.next() * items.length)] as T;
    },
    sample<T>(items: readonly T[], count: number): T[] {
      const pool = [...items];
      const picked: T[] = [];
      while (picked.length < count && pool.length > 0) {
        picked.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0] as T);
      }
      return picked;
    },
  };
}
