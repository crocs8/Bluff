import type { Card, DeckCount, Rank } from '@bluff/shared';
import type { DomainEvent, PlayerView } from '@bluff/game-engine';

export interface RoomView {
  readonly roomId: string;
  readonly hostPlayerId: string;
  readonly numberOfDecks: DeckCount;
  readonly gameStarted: boolean;
  readonly revision: number;
  readonly selfPlayerId: string;
  readonly players: Array<{
    readonly id: string;
    readonly username: string;
    readonly connectionStatus: 'CONNECTED' | 'DISCONNECTED';
  }>;
}

export interface GameViewEnvelope {
  readonly revision: number;
  readonly game: PlayerView;
}

export type PublicGameEvent = Exclude<DomainEvent, { type: 'ChallengeResolved' }> | {
  readonly type: 'ChallengeResolved';
  readonly challengerId: string;
  readonly challengedPlayerId: string;
  readonly wasTruthful: boolean;
};

export interface ChallengeResult {
  readonly challengerId: string;
  readonly challengedPlayerId: string;
  readonly claimedRank: Rank;
  readonly revealedCards: Card[];
  readonly wasTruthful: boolean;
  readonly revision: number;
}

export interface ClientToServerEvents {
  'room:create': (payload: { username: string }, ack: Ack) => void;
  'room:join': (payload: { roomId: string; username: string }, ack: Ack) => void;
  'room:leave': (payload: Record<string, never>, ack: Ack) => void;
  'room:configure': (payload: { numberOfDecks: DeckCount }, ack: Ack) => void;
  'room:start': (payload: Record<string, never>, ack: Ack) => void;
  'game:play': (payload: { cardIds: string[]; claimedRank: Rank }, ack: Ack) => void;
  'game:skip': (payload: Record<string, never>, ack: Ack) => void;
  'game:call-bluff': (payload: Record<string, never>, ack: Ack) => void;
  'session:resume': (payload: { playerId: string }, ack: Ack) => void;
}

export interface ServerToClientEvents {
  'room:view': (view: RoomView) => void;
  'game:view': (view: GameViewEnvelope) => void;
  'game:event': (event: PublicGameEvent & { readonly revision: number }) => void;
  'game:challenge-result': (result: ChallengeResult) => void;
  'action:error': (error: { code: string; message: string }) => void;
  'connection:status': (payload: { playerId: string; status: 'CONNECTED' | 'DISCONNECTED' }) => void;
}

export type Ack = (response: { ok: true; revision: number; playerId?: string; roomId?: string } | { ok: false; code: string; message: string }) => void;
