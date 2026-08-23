import { randomInt } from 'node:crypto';

export interface RandomSource {
  nextInt(upperExclusive: number): number;
}

export const cryptoRandom: RandomSource = {
  nextInt(upperExclusive: number): number {
    if (!Number.isSafeInteger(upperExclusive) || upperExclusive <= 0) {
      throw new RangeError('upperExclusive must be a positive safe integer');
    }

    return randomInt(upperExclusive);
  },
};

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = random.nextInt(index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current!;
  }

  return shuffled;
}
