import { describe, expect, it } from 'vitest';

import { shuffle, type RandomSource } from './random.js';

const alwaysZero: RandomSource = {
  nextInt: () => 0,
};

describe('shuffle', () => {
  it('returns a new deterministic permutation without mutating its input', () => {
    const input = [1, 2, 3, 4];

    expect(shuffle(input, alwaysZero)).toEqual([2, 3, 4, 1]);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it('preserves all items', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const output = shuffle(input, alwaysZero);

    expect([...output].sort()).toEqual(input);
  });
});
