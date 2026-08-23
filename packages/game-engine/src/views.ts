import type { Card, GamePhase, Rank } from '@bluff/shared';

import type { GameState } from './game.js';
import { getLegalActions, type LegalActions } from './legal-actions.js';

export interface PlayerView {
  readonly roomId: string;
  readonly phase: GamePhase;
  readonly roundNumber: number;
  readonly seatingOrder: string[];
  readonly currentPlayerId?: string;
  readonly players: Array<{ readonly id: string; readonly username: string; readonly status: 'CONNECTED' | 'DISCONNECTED' | 'ELIMINATED'; readonly cardCount: number; readonly rank?: number }>;
  readonly hand: Card[];
  readonly playingPileCount: number;
  readonly lastClaim?: { readonly playerId: string; readonly cardCount: number; readonly claimedRank: Rank };
  readonly rankings: string[];
  readonly legalActions: LegalActions;
}

export function getPlayerView(state: GameState, viewerId: string): PlayerView | undefined {
  const viewer = state.players.get(viewerId);
  if (!viewer) return undefined;
  return {
    roomId: state.roomId, phase: state.phase, roundNumber: state.roundNumber, seatingOrder: [...state.seatingOrder],
    ...(state.currentPlayerId === undefined ? {} : { currentPlayerId: state.currentPlayerId }),
    players: [...state.players.values()].map((player) => ({ id: player.id, username: player.username, status: player.status, cardCount: player.hand.length, ...(player.rank === undefined ? {} : { rank: player.rank }) })),
    hand: [...viewer.hand], playingPileCount: state.playingPile.length,
    ...(state.lastPlay === undefined ? {} : { lastClaim: { playerId: state.lastPlay.playerId, cardCount: state.lastPlay.actualCards.length, claimedRank: state.lastPlay.claimedRank } }),
    rankings: [...state.rankings], legalActions: getLegalActions(state, viewerId),
  };
}
