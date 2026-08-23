import { describe, expect, it } from 'vitest';

import { nextActivePlayerAtOrAfter, nextActivePlayerId } from './turn-order.js';

describe('turn order', () => {
  const seating = ['A', 'B', 'C', 'D', 'E'];

  it('rotates in the fixed circular seating order', () => {
    const active = new Set(seating);

    expect(nextActivePlayerId(seating, active, 'A')).toBe('B');
    expect(nextActivePlayerId(seating, active, 'E')).toBe('A');
  });

  it('skips eliminated players without changing seating order', () => {
    const active = new Set(['A', 'C', 'E']);

    expect(nextActivePlayerId(seating, active, 'A')).toBe('C');
    expect(nextActivePlayerId(seating, active, 'C')).toBe('E');
    expect(nextActivePlayerId(seating, active, 'E')).toBe('A');
  });

  it('resolves an eliminated intended starter to the next active player clockwise', () => {
    const active = new Set(['B', 'C', 'D', 'E']);

    expect(nextActivePlayerAtOrAfter(seating, active, 'A')).toBe('B');
    expect(nextActivePlayerAtOrAfter(seating, active, 'C')).toBe('C');
  });

  it('returns undefined for an invalid reference or empty active set', () => {
    expect(nextActivePlayerId(seating, new Set(), 'A')).toBeUndefined();
    expect(nextActivePlayerAtOrAfter(seating, new Set(['A']), 'missing')).toBeUndefined();
  });
});
