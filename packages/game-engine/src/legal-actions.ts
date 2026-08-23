import type { GameState } from './game.js';

export interface LegalActions {
  readonly canPlay: boolean;
  readonly canSkip: boolean;
  readonly canCallBluff: boolean;
  readonly maxPlayCards: number;
}

export function getLegalActions(state: GameState, playerId: string): LegalActions {
  const player = state.players.get(playerId);
  const canAct = state.phase === 'PLAYING' && state.currentPlayerId === playerId && player?.status !== 'ELIMINATED';
  return {
    canPlay: canAct === true,
    canSkip: canAct === true && state.lastPlay !== undefined,
    canCallBluff: canAct === true && state.lastPlay !== undefined && state.lastPlay.playerId !== playerId,
    maxPlayCards: state.numberOfDecks * 4,
  };
}
