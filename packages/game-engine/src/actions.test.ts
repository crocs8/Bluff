import { describe, expect, it } from 'vitest';

import { applyAction } from './actions.js';
import { createGame, type GameState } from './game.js';
import { getLegalActions } from './legal-actions.js';
import type { RandomSource } from './random.js';
import { assertGameStateInvariants } from './invariants.js';

const alwaysZero: RandomSource = { nextInt: () => 0 };
const playerIds = ['A', 'B', 'C', 'D'];

function game(playerCount = 4, decks: 1 | 2 = 1): GameState {
  return createGame({ roomId: 'TEST', numberOfDecks: decks, players: playerIds.slice(0, playerCount).map((id) => ({ id, username: id })), random: alwaysZero });
}

function cardId(state: GameState, playerId: string, rank?: string): string {
  const card = state.players.get(playerId)!.hand.find((candidate) => rank === undefined || candidate.rank === rank);
  if (!card) throw new Error(`No suitable card for ${playerId}`);
  return card.id;
}

function accepted(result: ReturnType<typeof applyAction>): GameState {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  assertGameStateInvariants(result.state);
  return result.state;
}

describe('PLAY', () => {
  it('moves owned cards face-down to the pile, accepts arbitrary claims, and advances the turn', () => {
    const state = game();
    const selected = cardId(state, 'A');
    const next = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [selected], claimedRank: 'K' }));

    expect(next.players.get('A')!.hand.map((card) => card.id)).not.toContain(selected);
    expect(next.playingPile.map((card) => card.id)).toEqual([selected]);
    expect(next.lastPlay?.claimedRank).toBe('K');
    expect(next.roundLockedRank).toBe('K');
    expect(next.lastPlayedBy).toBe('A');
    expect(next.currentPlayerId).toBe('B');
    expect(state.players.get('A')!.hand.map((card) => card.id)).toContain(selected);
  });

  it('locks the first claim while allowing later players to play any physical cards', () => {
    let state = game();
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'A', 'A')], claimedRank: 'K' }));
    const laterCard = cardId(state, 'B', '2');
    expect(applyAction(state, 'B', { type: 'PLAY', cardIds: [laterCard], claimedRank: 'A' })).toMatchObject({ ok: false, error: { code: 'INVALID_CLAIMED_RANK' } });
    state = accepted(applyAction(state, 'B', { type: 'PLAY', cardIds: [laterCard], claimedRank: 'K' }));
    expect(state.lastPlay?.claimedRank).toBe('K');
    expect(state.roundLockedRank).toBe('K');
  });

  it('rejects zero cards, too many cards, duplicate IDs, and cards not owned by the actor', () => {
    const state = game();
    const own = cardId(state, 'A');
    const tooMany = state.players.get('A')!.hand.slice(0, 5).map((card) => card.id);
    expect(applyAction(state, 'A', { type: 'PLAY', cardIds: [], claimedRank: 'A' })).toMatchObject({ ok: false, error: { code: 'INVALID_CARD_COUNT' } });
    expect(applyAction(state, 'A', { type: 'PLAY', cardIds: tooMany, claimedRank: 'A' })).toMatchObject({ ok: false, error: { code: 'INVALID_CARD_COUNT' } });
    expect(applyAction(state, 'A', { type: 'PLAY', cardIds: [own, own], claimedRank: 'A' })).toMatchObject({ ok: false, error: { code: 'DUPLICATE_CARD_ID' } });
    expect(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'B')], claimedRank: 'A' })).toMatchObject({ ok: false, error: { code: 'CARD_NOT_OWNED' } });
  });

  it('allows an eight-card play only with two decks', () => {
    const state = game(4, 2);
    const eight = state.players.get('A')!.hand.slice(0, 8).map((card) => card.id);
    expect(accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: eight, claimedRank: '2' })).playingPile).toHaveLength(8);
    expect(getLegalActions(state, 'A').maxPlayCards).toBe(8);
  });
});

describe('SKIP and natural rounds', () => {
  it('requires a first play and preserves the latest challenge target across skips', () => {
    let state = game(3);
    expect(applyAction(state, 'A', { type: 'SKIP' })).toMatchObject({ ok: false, error: { code: 'PLAY_REQUIRED' } });
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'A')], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    expect(state.lastPlayedBy).toBe('A');
    expect(state.lastPlay?.playerId).toBe('A');
    expect(state.currentPlayerId).toBe('C');
    expect(getLegalActions(state, 'C').canCallBluff).toBe(true);
  });

  it('ends A-play, B-skip, C-skip, A-skip naturally and resets the playing pile to empty for next round', () => {
    let state = game(3);
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'A')], claimedRank: 'A' }));
    expect(state.playingPile).toHaveLength(1);
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    state = accepted(applyAction(state, 'C', { type: 'SKIP' }));
    const result = applyAction(state, 'A', { type: 'SKIP' });
    state = accepted(result);
    expect(result.ok && result.events).toContainEqual(expect.objectContaining({ type: 'RoundEnded', reason: 'NATURAL', starterId: 'A' }));
    expect(state.playingPile).toHaveLength(0);
    expect(state.discardPile).toHaveLength(1);
    expect(state.lastPlay).toBeUndefined();
    expect(state.currentPlayerId).toBe('A');
    expect(state.roundNumber).toBe(2);
    expect(state.roundLockedRank).toBeUndefined();
  });

  it('times out an unstarted round without selecting a rank', () => {
    let state = game();
    state = accepted(applyAction(state, 'A', { type: 'TIMEOUT' }));
    expect(state.currentPlayerId).toBe('B');
    expect(state.roundLockedRank).toBeUndefined();
    state = accepted(applyAction(state, 'B', { type: 'PLAY', cardIds: [cardId(state, 'B')], claimedRank: 'Q' }));
    expect(state.roundLockedRank).toBe('Q');
  });

  it('uses the newest play for the natural-round boundary and discards completed round pile', () => {
    let state = game(3);
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'A')], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    state = accepted(applyAction(state, 'C', { type: 'PLAY', cardIds: [cardId(state, 'C')], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'A', { type: 'SKIP' }));
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    state = accepted(applyAction(state, 'C', { type: 'SKIP' }));
    expect(state.lastPlay).toBeUndefined();
    expect(state.currentPlayerId).toBe('C');
    expect(state.playingPile).toHaveLength(0);
    expect(state.discardPile).toHaveLength(2);
  });
});

describe('CALL BLUFF', () => {
  it('allows a challenge after skips and resolves a bluff by giving the pile to the liar', () => {
    let state = game(3);
    const played = cardId(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [played], claimedRank: 'K' }));
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    const result = applyAction(state, 'C', { type: 'CALL_BLUFF' });
    state = accepted(result);
    expect(state.players.get('A')!.hand.map((card) => card.id)).toContain(played);
    expect(state.playingPile).toEqual([]);
    expect(state.currentPlayerId).toBe('C');
    expect(result.ok && result.events).toContainEqual(expect.objectContaining({ type: 'ChallengeResolved', wasTruthful: false, revealedCards: [expect.objectContaining({ id: played })] }));
  });

  it('resolves a truthful challenge by giving the pile to the challenger', () => {
    let state = game(3);
    const played = cardId(state, 'A', 'A');
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [played], claimedRank: 'A' }));
    const result = applyAction(state, 'B', { type: 'CALL_BLUFF' });
    state = accepted(result);
    expect(state.players.get('B')!.hand.map((card) => card.id)).toContain(played);
    expect(state.playingPile).toEqual([]);
    expect(state.currentPlayerId).toBe('A');
    expect(result.ok && result.events).toContainEqual(expect.objectContaining({ type: 'ChallengeResolved', wasTruthful: true }));
  });

  it('only permits the most recent play to be challenged and forbids self-challenge', () => {
    let state = game(4);
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [cardId(state, 'A')], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'B', { type: 'PLAY', cardIds: [cardId(state, 'B')], claimedRank: 'A' }));
    state = accepted(applyAction(state, 'C', { type: 'SKIP' }));
    const result = applyAction(state, 'D', { type: 'CALL_BLUFF' });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events).toContainEqual(expect.objectContaining({ type: 'ChallengeCalled', challengedPlayerId: 'B' }));

    const ownTurn = { ...state, currentPlayerId: 'B' };
    expect(applyAction(ownTurn, 'B', { type: 'CALL_BLUFF' })).toMatchObject({ ok: false, error: { code: 'SELF_CHALLENGE_FORBIDDEN' } });
  });
});

describe('Zero-Card Players and Consecutive Skips', () => {
  it('does not end round immediately when player plays last card and next player skips', () => {
    let state = game(3);
    // Give A only 1 card for test
    const aCard = state.players.get('A')!.hand[0]!;
    const discardedA = state.players.get('A')!.hand.slice(1);
    const playersMap = new Map(state.players);
    playersMap.set('A', { ...state.players.get('A')!, hand: [aCard] });
    state = { ...state, players: playersMap, discardPile: [...discardedA] };
    assertGameStateInvariants(state);

    // A plays their last card truthfully
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [aCard.id], claimedRank: aCard.rank }));
    expect(state.players.get('A')!.hand).toHaveLength(0);
    expect(state.currentPlayerId).toBe('B');

    // B skips — turn MUST go to C, NOT terminate round prematurely
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    expect(state.currentPlayerId).toBe('C');
    expect(state.phase).toBe('PLAYING');

    // C challenges A
    const result = applyAction(state, 'C', { type: 'CALL_BLUFF' });
    state = accepted(result);
    // Since A was truthful, A is now ranked 1st, C takes pile
    expect(state.players.get('A')!.status).toBe('ELIMINATED');
    expect(state.rankings).toContain('A');
    expect(state.players.get('A')!.rank).toBe(1);
  });

  it('allows zero-card player to win naturally when everyone skips', () => {
    let state = game(3);
    const aCard = state.players.get('A')!.hand[0]!;
    const discardedA = state.players.get('A')!.hand.slice(1);
    const playersMap = new Map(state.players);
    playersMap.set('A', { ...state.players.get('A')!, hand: [aCard] });
    state = { ...state, players: playersMap, discardPile: [...discardedA] };

    // A plays last card
    state = accepted(applyAction(state, 'A', { type: 'PLAY', cardIds: [aCard.id], claimedRank: aCard.rank }));
    // B skips
    state = accepted(applyAction(state, 'B', { type: 'SKIP' }));
    expect(state.currentPlayerId).toBe('C');
    // C skips
    state = accepted(applyAction(state, 'C', { type: 'SKIP' }));
    expect(state.currentPlayerId).toBe('A');
    // A skips -> round ends naturally
    state = accepted(applyAction(state, 'A', { type: 'SKIP' }));
    // A survived unchallenged with 0 cards -> A is ranked 1st
    expect(state.players.get('A')!.status).toBe('ELIMINATED');
    expect(state.rankings).toContain('A');
    expect(state.rankings[0]).toBe('A');
  });
});
