import { describe, expect, it } from 'vitest';

import { applyAction } from './actions.js';
import { createGame, type GameState } from './game.js';
import type { RandomSource } from './random.js';
import { getPlayerView } from './views.js';

const alwaysZero: RandomSource = { nextInt: () => 0 };

function game(playerCount = 3): GameState {
  return createGame({ roomId: 'TEST', numberOfDecks: 1, players: ['A', 'B', 'C'].slice(0, playerCount).map((id) => ({ id, username: id })), random: alwaysZero });
}

function accepted(result: ReturnType<typeof applyAction>): GameState {
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function retainOneCard(state: GameState, playerId: string, rank: string): string {
  const player = state.players.get(playerId)!;
  const card = player.hand.find((candidate) => candidate.rank === rank);
  if (!card) throw new Error('Expected test rank in hand');
  const discarded = player.hand.filter((c) => c.id !== card.id);
  player.hand.splice(0, player.hand.length, card);
  (state.discardPile as any)?.push?.(...discarded);
  return card.id;
}

describe('final plays, ranking, and game end', () => {
  it('allows turn to continue to next player when immediate next player skips after final card play', () => {
    let state = game();
    const finalCard = retainOneCard(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [finalCard], claimedRank: 'A' }));
    // B skips — turn MUST advance to C so C gets opportunity to challenge A
    const result = applyAction(state, 'B', { type: 'SKIP' });
    state = accepted(result);

    expect(state.currentPlayerId).toBe('C');
    expect(state.lastPlay?.playerId).toBe('A');
    expect(state.phase).toBe('PLAYING');

    // C challenges A
    const challengeRes = accepted(applyAction(state, 'C', { type: 'CALL_BLUFF' }));
    // A was truthful -> A is ranked 1st
    expect(challengeRes.players.get('A')).toMatchObject({ status: 'ELIMINATED', rank: 1 });
    expect(challengeRes.rankings).toEqual(['A']);
  });

  it('ranks a truthful final player when challenged and skips that eliminated intended starter', () => {
    let state = game();
    const finalCard = retainOneCard(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [finalCard], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'B', { type: 'CALL_BLUFF' }));

    expect(state.players.get('A')).toMatchObject({ status: 'ELIMINATED', rank: 1 });
    expect(state.players.get('B')!.hand.map((card) => card.id)).toContain(finalCard);
    expect(state.currentPlayerId).toBe('B');
  });

  it('does not rank a bluffed final player; they take the pile and the challenger starts', () => {
    let state = game();
    const finalCard = retainOneCard(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [finalCard], claimedRank: 'K' }));
    state = accepted(applyAction(state, 'B', { type: 'CALL_BLUFF' }));

    expect(state.players.get('A')).toMatchObject({ status: 'CONNECTED' });
    expect(state.players.get('A')!.hand.map((card) => card.id)).toContain(finalCard);
    expect(state.rankings).toEqual([]);
    expect(state.currentPlayerId).toBe('B');
  });

  it('ends the game and ranks the final loser when one active player remains', () => {
    let state = game(2);
    const finalCard = retainOneCard(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [finalCard], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'B', { type: 'CALL_BLUFF' }));

    expect(state.phase).toBe('GAME_END');
    expect(state.rankings).toEqual(['A', 'B']);
    expect(state.players.get('B')).toMatchObject({ rank: 2, status: 'ELIMINATED' });
    expect(state.currentPlayerId).toBeUndefined();
  });
});

describe('player-specific views', () => {
  it('exposes only the viewer hand and never reserve or hidden played cards', () => {
    let state = game();
    const played = state.players.get('A')!.hand[0]!;
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [played.id], claimedRank: 'K' }));
    const view = getPlayerView(state, 'B');

    expect(view).toBeDefined();
    expect(view!.hand).toEqual(state.players.get('B')!.hand);
    expect(view!.players.find((player) => player.id === 'A')).toEqual(expect.objectContaining({ cardCount: state.players.get('A')!.hand.length }));
    expect(view).not.toHaveProperty('reservePile');
    expect(view).not.toHaveProperty('playingPile');
    expect(view!.lastClaim).toEqual({ playerId: 'A', cardCount: 1, claimedRank: 'K' });
    expect(view!.roundLockedRank).toBe('K');
    expect(JSON.stringify(view)).not.toContain(played.id);
  });

  it('reports legal actions accurately for first turn, normal turn, and eliminated players', () => {
    let state = game();
    expect(getPlayerView(state, 'A')!.legalActions).toMatchObject({ canPlay: true, canSkip: false, canCallBluff: false });
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [state.players.get('A')!.hand[0]!.id], claimedRank: 'A' }));
    expect(getPlayerView(state, 'B')!.legalActions).toMatchObject({ canPlay: true, canSkip: true, canCallBluff: true });
    const eliminatedState: GameState = {
      ...state,
      players: new Map([...state.players.entries()].map(([id, player]) => [id, id === 'C' ? { ...player, status: 'ELIMINATED' as const } : player])),
    };
    expect(getPlayerView(eliminatedState, 'C')!.legalActions).toMatchObject({ canPlay: false, canSkip: false, canCallBluff: false });
  });
});
