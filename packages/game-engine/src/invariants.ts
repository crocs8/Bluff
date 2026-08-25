import type { GameState } from './game.js';

/** Throws when authoritative state violates a core engine invariant. */
export function assertGameStateInvariants(state: GameState): void {
  if (new Set(state.seatingOrder).size !== state.seatingOrder.length) throw new Error('Seating order contains duplicate players.');
  if (state.players.size !== state.seatingOrder.length) throw new Error('Player registry does not match seating order.');
  const allCardIds = [...state.reservePile.map((card) => card.id), ...state.playingPile.map((card) => card.id), ...[...state.players.values()].flatMap((player) => player.hand.map((card) => card.id))];
  if (allCardIds.length !== state.numberOfDecks * 52 || new Set(allCardIds).size !== allCardIds.length) throw new Error('Every card must exist in exactly one valid location.');
  if (state.currentPlayerId !== undefined && state.players.get(state.currentPlayerId)?.status === 'ELIMINATED') throw new Error('An eliminated player cannot hold the active turn.');
  if ((state.lastPlay === undefined) !== (state.lastPlayedBy === undefined)) throw new Error('lastPlay and lastPlayedBy must be set together.');
  if ((state.lastPlay === undefined) !== (state.roundLockedRank === undefined)) throw new Error('A round rank must exist exactly when a round has a play.');
  if (state.lastPlay && state.lastPlay.claimedRank !== state.roundLockedRank) throw new Error('The latest claim must use the locked round rank.');
  if (state.lastPlay && state.lastPlay.playerId !== state.lastPlayedBy) throw new Error('lastPlay player must equal lastPlayedBy.');
  if (state.rankings.some((playerId, index) => state.players.get(playerId)?.rank !== index + 1)) throw new Error('Rankings must match assigned player ranks.');
}
