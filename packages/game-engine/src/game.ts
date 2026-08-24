import type { Card, DeckCount, GamePhase, PlayerConnectionStatus, Rank } from '@bluff/shared';

import { createDeck } from './deck.js';
import { dealEqually } from './dealing.js';
import { cryptoRandom, shuffle, type RandomSource } from './random.js';

export interface InitialPlayer { readonly id: string; readonly username: string; }

export interface GamePlayer extends InitialPlayer {
  readonly hand: Card[];
  readonly status: PlayerConnectionStatus;
  readonly rank?: number;
}

export interface LastPlay {
  readonly playerId: string;
  readonly actualCards: Card[];
  readonly claimedRank: Rank;
}

export interface GameState {
  readonly roomId: string;
  readonly numberOfDecks: DeckCount;
  readonly phase: GamePhase;
  readonly seatingOrder: string[];
  readonly players: ReadonlyMap<string, GamePlayer>;
  readonly reservePile: Card[];
  readonly playingPile: Card[];
  readonly currentPlayerId: string | undefined;
  readonly roundLockedRank: Rank | undefined;
  readonly lastPlay: LastPlay | undefined;
  readonly lastPlayedBy: string | undefined;
  readonly rankings: string[];
  readonly roundNumber: number;
}

export interface CreateGameInput {
  readonly roomId: string;
  readonly numberOfDecks: DeckCount;
  readonly players: readonly InitialPlayer[];
  readonly random?: RandomSource;
}

export function createGame(input: CreateGameInput): GameState {
  const random = input.random ?? cryptoRandom;
  validateInitialPlayers(input.players);
  const seatingOrder = input.players.map((player) => player.id);
  const deal = dealEqually(shuffle(createDeck(input.numberOfDecks), random), seatingOrder);
  const players = new Map<string, GamePlayer>();
  for (const player of input.players) {
    players.set(player.id, { ...player, hand: deal.handsByPlayerId.get(player.id)!, status: 'CONNECTED' });
  }
  return {
    roomId: input.roomId, numberOfDecks: input.numberOfDecks, phase: 'PLAYING', seatingOrder, players,
    reservePile: deal.reservePile, playingPile: [], currentPlayerId: seatingOrder[random.nextInt(seatingOrder.length)]!, roundLockedRank: undefined, lastPlay: undefined, lastPlayedBy: undefined,
    rankings: [], roundNumber: 1,
  };
}

/** @deprecated Use createGame. Kept temporarily for Phase 1 callers. */
export const createInitialGame = createGame;

function validateInitialPlayers(players: readonly InitialPlayer[]): void {
  if (players.length < 2 || players.length > 10) throw new RangeError('A game requires between 2 and 10 players');
  if (new Set(players.map((player) => player.id)).size !== players.length) throw new Error('Player IDs must be unique');
}
