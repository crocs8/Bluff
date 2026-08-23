import { describe, expect, it } from 'vitest';

import { createDeck } from './deck.js';
import { dealEqually } from './dealing.js';

describe('dealEqually', () => {
  it('deals five players ten cards each and keeps two cards permanently in reserve', () => {
    const deck = createDeck(1);
    const playerIds = ['A', 'B', 'C', 'D', 'E'];
    const result = dealEqually(deck, playerIds);

    expect(result.cardsPerPlayer).toBe(10);
    expect(result.reservePile).toHaveLength(2);
    expect([...result.handsByPlayerId.values()].every((hand) => hand.length === 10)).toBe(true);
    expect(new Set([...result.handsByPlayerId.values()].flat().map((card) => card.id))).toHaveLength(50);
    expect(result.reservePile.map((card) => card.id)).toEqual(deck.slice(50).map((card) => card.id));
  });

  it('deals six players eight cards each and reserves four cards', () => {
    const result = dealEqually(createDeck(1), ['A', 'B', 'C', 'D', 'E', 'F']);

    expect(result.cardsPerPlayer).toBe(8);
    expect(result.reservePile).toHaveLength(4);
    expect([...result.handsByPlayerId.values()].every((hand) => hand.length === 8)).toBe(true);
  });

  it('deals a 104-card set equally with no reserve when player count divides it', () => {
    const result = dealEqually(createDeck(2), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    expect(result.cardsPerPlayer).toBe(13);
    expect(result.reservePile).toHaveLength(0);
    expect([...result.handsByPlayerId.values()].flat()).toHaveLength(104);
  });

  it('rejects invalid player lists', () => {
    expect(() => dealEqually(createDeck(1), ['A'])).toThrow('At least two players');
    expect(() => dealEqually(createDeck(1), ['A', 'A'])).toThrow('Player IDs must be unique');
  });
});
