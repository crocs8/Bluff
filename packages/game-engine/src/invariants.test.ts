import { describe, expect, it } from 'vitest';

import { applyAction } from './actions.js';
import { createGame } from './game.js';
import { assertGameStateInvariants } from './invariants.js';
import type { RandomSource } from './random.js';

const alwaysZero: RandomSource = { nextInt: () => 0 };

describe('assertGameStateInvariants', () => {
  it('accepts created and transitioned authoritative states', () => {
    const initial = createGame({ roomId: 'TEST', numberOfDecks: 1, players: ['A', 'B', 'C'].map((id) => ({ id, username: id })), random: alwaysZero });
    const play = applyAction(initial, 'A', { type: 'PLAY', cardIds: [initial.players.get('A')!.hand[0]!.id], claimedRank: 'K' });
    if (!play.ok) throw new Error(play.error.code);
    expect(() => assertGameStateInvariants(initial)).not.toThrow();
    expect(() => assertGameStateInvariants(play.state)).not.toThrow();
  });

  it('detects duplicate card locations', () => {
    const state = createGame({ roomId: 'TEST', numberOfDecks: 1, players: ['A', 'B'].map((id) => ({ id, username: id })), random: alwaysZero });
    const invalid = { ...state, playingPile: [state.players.get('A')!.hand[0]!] };
    expect(() => assertGameStateInvariants(invalid)).toThrow('Every card');
  });
});
