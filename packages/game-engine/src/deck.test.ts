import { describe, expect, it } from 'vitest';

import { createDeck } from './deck.js';

describe('createDeck', () => {
  it('creates a standard 52-card deck with four copies of each rank', () => {
    const deck = createDeck(1);

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
    expect(new Set(deck.map((card) => card.deckIndex))).toEqual(new Set([0]));

    for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
      expect(deck.filter((card) => card.rank === rank)).toHaveLength(4);
    }
  });

  it('creates a 104-card two-deck set with eight copies of each rank and unique IDs', () => {
    const deck = createDeck(2);

    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((card) => card.id)).size).toBe(104);
    expect(new Set(deck.map((card) => card.deckIndex))).toEqual(new Set([0, 1]));

    for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
      expect(deck.filter((card) => card.rank === rank)).toHaveLength(8);
    }
  });
});
