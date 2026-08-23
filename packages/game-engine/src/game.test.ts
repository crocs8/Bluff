import { describe, expect, it } from 'vitest';

import { createInitialGame } from './game.js';
import type { RandomSource } from './random.js';

const alwaysZero: RandomSource = {
  nextInt: () => 0,
};

describe('createInitialGame', () => {
  it('creates a playing game with fixed seating, an empty active pile, and an equally dealt reserve', () => {
    const game = createInitialGame({
      roomId: 'ABC123',
      numberOfDecks: 1,
      players: [
        { id: 'A', username: 'Ada' },
        { id: 'B', username: 'Ben' },
        { id: 'C', username: 'Cam' },
        { id: 'D', username: 'Dee' },
        { id: 'E', username: 'Eli' },
      ],
      random: alwaysZero,
    });

    expect(game.phase).toBe('PLAYING');
    expect(game.seatingOrder).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(game.currentPlayerId).toBe('A');
    expect(game.playingPile).toEqual([]);
    expect(game.reservePile).toHaveLength(2);
    expect([...game.players.values()].every((player) => player.hand.length === 10)).toBe(true);
    expect([...game.players.values()].every((player) => player.status === 'CONNECTED')).toBe(true);
  });

  it('sets up a two-deck game without duplicated cards across player hands or reserve', () => {
    const game = createInitialGame({
      roomId: 'TWO104',
      numberOfDecks: 2,
      players: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((id) => ({ id, username: id })),
      random: alwaysZero,
    });
    const allCards = [...game.players.values()].flatMap((player) => player.hand).concat(game.reservePile);

    expect(allCards).toHaveLength(104);
    expect(new Set(allCards.map((card) => card.id))).toHaveLength(104);
  });

  it('enforces the supported player range and unique player identities', () => {
    expect(() =>
      createInitialGame({ roomId: 'ONE', numberOfDecks: 1, players: [{ id: 'A', username: 'A' }] }),
    ).toThrow('between 2 and 10 players');

    expect(() =>
      createInitialGame({
        roomId: 'DUP',
        numberOfDecks: 1,
        players: [
          { id: 'A', username: 'A' },
          { id: 'A', username: 'Other A' },
        ],
      }),
    ).toThrow('Player IDs must be unique');
  });
});
