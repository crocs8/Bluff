import type { DomainEvent, PlayerView } from '@bluff/game-engine';
import type { Card, DeckCount, Rank } from '@bluff/shared';

export interface RoomView { roomId: string; hostPlayerId: string; numberOfDecks: DeckCount; gameStarted: boolean; revision: number; selfPlayerId: string; players: Array<{ id: string; username: string; connectionStatus: 'CONNECTED' | 'DISCONNECTED' }>; }
export interface GameViewEnvelope { revision: number; turnDeadlineAt?: number; game: PlayerView; }
export interface ChallengeResult { challengerId: string; challengedPlayerId: string; claimedRank: Rank; revealedCards: Card[]; wasTruthful: boolean; revision: number; }
export type PublicGameEvent = Exclude<DomainEvent, { type: 'ChallengeResolved' }> | { type: 'ChallengeResolved'; challengerId: string; challengedPlayerId: string; wasTruthful: boolean };
