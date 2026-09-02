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

// ── Exactly 12 Quick Chat Preset Messages ──────────
export const QUICK_CHAT_MESSAGES = {
  PAKADO: '🧢 Pakado',
  CHAL_CHAL_CHAL: '😏 Chal Chal Chal',
  I_SEE_YOU: '👀 I see you...',
  SERIOUSLY: '🤨 Seriously?',
  NO_WAY: '😭 No way!',
  BLUFF_KAR_RAHA_HAI: '😈 Bluff kar raha hai',
  PAKDA_GAYA: '💀 Pakda gaya',
  KYA_BAAT_HAI: '🫡 Kya baat hai',
  LETS_GO: "🔥 Let's go!",
  LOL: '😂 LOL',
  MUJHE_Q_TODA: '😭 Mujhe Q toda?',
  MKB_BLUFF: '🗿 MKB BLUFF',
} as const;

export type QuickChatMessageId = keyof typeof QUICK_CHAT_MESSAGES;

export const QUICK_CHAT_IDS = Object.keys(QUICK_CHAT_MESSAGES) as QuickChatMessageId[];
