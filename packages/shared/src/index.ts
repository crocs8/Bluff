export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Rank = (typeof RANKS)[number];

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

export type Suit = (typeof SUITS)[number];

export type DeckCount = 1 | 2;

export interface Card {
  readonly id: string;
  readonly rank: Rank;
  readonly suit: Suit;
  readonly deckIndex: number;
}

export type GamePhase = 'LOBBY' | 'DEALING' | 'PLAYING' | 'CHALLENGE_RESOLUTION' | 'ROUND_END' | 'GAME_END';

export type PlayerConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ELIMINATED';

export type ActionAck =
  | { readonly ok: true; readonly revision: number }
  | { readonly ok: false; readonly code: string; readonly message: string };
