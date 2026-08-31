import { RANKS, type Card, type Rank } from '@bluff/shared';

import type { GamePlayer, GameState, LastPlay } from './game.js';
import { nextActivePlayerAtOrAfter, nextActivePlayerId } from './turn-order.js';

export type GameAction =
  | { readonly type: 'PLAY'; readonly cardIds: readonly string[]; readonly claimedRank: Rank }
  | { readonly type: 'SKIP' }
  | { readonly type: 'CALL_BLUFF' }
  | { readonly type: 'TIMEOUT' };

export type GameErrorCode =
  | 'GAME_NOT_PLAYING'
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_ELIMINATED'
  | 'NOT_YOUR_TURN'
  | 'PLAY_REQUIRED'
  | 'NO_PLAY_TO_CHALLENGE'
  | 'SELF_CHALLENGE_FORBIDDEN'
  | 'INVALID_CARD_COUNT'
  | 'DUPLICATE_CARD_ID'
  | 'CARD_NOT_OWNED'
  | 'INVALID_CLAIMED_RANK';

export interface GameError { readonly code: GameErrorCode; readonly message: string; }

export type DomainEvent =
  | { readonly type: 'PlayAccepted'; readonly playerId: string; readonly cardCount: number; readonly claimedRank: Rank }
  | { readonly type: 'PlayerSkipped'; readonly playerId: string }
  | { readonly type: 'PlayerTimedOut'; readonly playerId: string }
  | { readonly type: 'ChallengeCalled'; readonly challengerId: string; readonly challengedPlayerId: string }
  | { readonly type: 'ChallengeResolved'; readonly challengerId: string; readonly challengedPlayerId: string; readonly claimedRank: Rank; readonly wasTruthful: boolean; readonly revealedCards: Card[] }
  | { readonly type: 'PlayingPileTransferred'; readonly recipientId: string; readonly cardCount: number }
  | { readonly type: 'PlayerRanked'; readonly playerId: string; readonly rank: number; readonly isLoser: boolean }
  | { readonly type: 'RoundEnded'; readonly reason: 'NATURAL' | 'CHALLENGE' | 'FINAL_PLAY_SAFE'; readonly starterId?: string }
  | { readonly type: 'GameEnded'; readonly loserId: string };

export type ApplyActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: DomainEvent[] }
  | { readonly ok: false; readonly error: GameError };

export function applyAction(state: GameState, actorId: string, action: GameAction): ApplyActionResult {
  const validationError = validateActor(state, actorId, action);
  if (validationError) return { ok: false, error: validationError };
  const draft = cloneState(state);
  const events: DomainEvent[] = [];

  if (action.type === 'PLAY') applyPlay(draft, actorId, action, events);
  else if (action.type === 'SKIP') applySkip(draft, actorId, events);
  else if (action.type === 'TIMEOUT') applyTimeout(draft, actorId, events);
  else applyChallenge(draft, actorId, events);

  return { ok: true, state: draft, events };
}

function validateActor(state: GameState, actorId: string, action: GameAction): GameError | undefined {
  if (state.phase !== 'PLAYING') return error('GAME_NOT_PLAYING', 'The game is not accepting actions.');
  const player = state.players.get(actorId);
  if (!player) return error('PLAYER_NOT_FOUND', 'Player does not belong to this game.');
  if (player.status === 'ELIMINATED') return error('PLAYER_ELIMINATED', 'Eliminated players cannot act.');
  if (state.currentPlayerId !== actorId) return error('NOT_YOUR_TURN', 'It is not this player’s turn.');
  if (action.type === 'SKIP' && !state.lastPlay) return error('PLAY_REQUIRED', 'The first turn of a round requires a play.');
  if (action.type === 'CALL_BLUFF') {
    if (!state.lastPlay) return error('NO_PLAY_TO_CHALLENGE', 'There is no play to challenge.');
    if (state.lastPlay.playerId === actorId) return error('SELF_CHALLENGE_FORBIDDEN', 'Players cannot challenge their own play.');
  }
  return action.type === 'PLAY' ? validatePlay(player, state.numberOfDecks, state.roundLockedRank, action) : undefined;
}

function validatePlay(player: GamePlayer, decks: 1 | 2, roundLockedRank: Rank | undefined, action: Extract<GameAction, { type: 'PLAY' }>): GameError | undefined {
  const maxCards = decks * 4;
  if (action.cardIds.length === 0 || action.cardIds.length > maxCards) return error('INVALID_CARD_COUNT', `A play must contain between 1 and ${maxCards} cards.`);
  if (new Set(action.cardIds).size !== action.cardIds.length) return error('DUPLICATE_CARD_ID', 'A card can only be selected once.');
  if (!RANKS.includes(action.claimedRank)) return error('INVALID_CLAIMED_RANK', 'Claimed rank is invalid.');
  if (roundLockedRank !== undefined && action.claimedRank !== roundLockedRank) return error('INVALID_CLAIMED_RANK', 'The round claim rank is already locked.');
  const handIds = new Set(player.hand.map((card) => card.id));
  if (action.cardIds.some((cardId) => !handIds.has(cardId))) return error('CARD_NOT_OWNED', 'Every selected card must belong to the acting player.');
  return undefined;
}

function applyPlay(draft: MutableGameState, actorId: string, action: Extract<GameAction, { type: 'PLAY' }>, events: DomainEvent[]): void {
  // If the previous play was by a player who now has 0 cards, their play is permanently safe
  if (draft.lastPlay && draft.players.get(draft.lastPlay.playerId)?.hand.length === 0) {
    rankPlayer(draft, draft.lastPlay.playerId, events);
    if (completeGameIfOnePlayerRemains(draft, events)) return;
  }
  const player = draft.players.get(actorId)!;
  const selectedIds = new Set(action.cardIds);
  const selectedCards = player.hand.filter((card) => selectedIds.has(card.id));
  player.hand = player.hand.filter((card) => !selectedIds.has(card.id));
  draft.playingPile.push(...selectedCards);
  const claimedRank = draft.roundLockedRank ?? action.claimedRank;
  draft.roundLockedRank = claimedRank;
  draft.lastPlay = { playerId: actorId, actualCards: selectedCards, claimedRank };
  draft.lastPlayedBy = actorId;
  draft.currentPlayerId = nextActivePlayerId(draft.seatingOrder, activePlayerIds(draft), actorId);
  events.push({ type: 'PlayAccepted', playerId: actorId, cardCount: selectedCards.length, claimedRank });
}

function applySkip(draft: MutableGameState, actorId: string, events: DomainEvent[]): void {
  events.push({ type: 'PlayerSkipped', playerId: actorId });
  if (draft.lastPlayedBy === actorId) closeRound(draft, actorId, 'NATURAL', events);
  else draft.currentPlayerId = nextActivePlayerId(draft.seatingOrder, activePlayerIds(draft), actorId);
}

function applyTimeout(draft: MutableGameState, actorId: string, events: DomainEvent[]): void {
  events.push({ type: 'PlayerTimedOut', playerId: actorId });
  if (draft.lastPlayedBy === actorId) closeRound(draft, actorId, 'NATURAL', events);
  else draft.currentPlayerId = nextActivePlayerId(draft.seatingOrder, activePlayerIds(draft), actorId);
}

function applyChallenge(draft: MutableGameState, challengerId: string, events: DomainEvent[]): void {
  const lastPlay = draft.lastPlay!;
  const challengedPlayerId = lastPlay.playerId;
  const wasTruthful = lastPlay.actualCards.every((card) => card.rank === lastPlay.claimedRank);
  const recipientId = wasTruthful ? challengerId : challengedPlayerId;
  const pile = [...draft.playingPile];
  events.push({ type: 'ChallengeCalled', challengerId, challengedPlayerId });
  draft.players.get(recipientId)!.hand.push(...pile);
  draft.playingPile = [];
  events.push({ type: 'PlayingPileTransferred', recipientId, cardCount: pile.length });
  events.push({ type: 'ChallengeResolved', challengerId, challengedPlayerId, claimedRank: lastPlay.claimedRank, wasTruthful, revealedCards: [...lastPlay.actualCards] });
  if (wasTruthful && draft.players.get(challengedPlayerId)!.hand.length === 0) {
    rankPlayer(draft, challengedPlayerId, events);
  }
  closeRound(draft, wasTruthful ? challengedPlayerId : challengerId, 'CHALLENGE', events);
}

function closeRound(draft: MutableGameState, intendedStarter: string, reason: Extract<DomainEvent, { type: 'RoundEnded' }>['reason'], events: DomainEvent[]): void {
  // If the last played player has 0 cards, they survive the round safely
  if (draft.lastPlay && draft.players.get(draft.lastPlay.playerId)?.hand.length === 0) {
    rankPlayer(draft, draft.lastPlay.playerId, events);
  }
  if (completeGameIfOnePlayerRemains(draft, events)) return;

  // Clear playing pile and discard completed round cards
  draft.discardPile.push(...draft.playingPile);
  draft.playingPile = [];

  draft.lastPlay = undefined;
  draft.lastPlayedBy = undefined;
  draft.roundLockedRank = undefined;
  draft.roundNumber += 1;
  draft.currentPlayerId = nextActivePlayerAtOrAfter(draft.seatingOrder, activePlayerIds(draft), intendedStarter);
  events.push({ type: 'RoundEnded', reason, ...(draft.currentPlayerId === undefined ? {} : { starterId: draft.currentPlayerId }) });
}

function rankPlayer(draft: MutableGameState, playerId: string, events: DomainEvent[], isLoser = false): void {
  const player = draft.players.get(playerId);
  if (!player || player.status === 'ELIMINATED') return;
  player.status = 'ELIMINATED';
  player.rank = draft.rankings.length + 1;
  draft.rankings.push(playerId);
  events.push({ type: 'PlayerRanked', playerId, rank: player.rank, isLoser });
}

function completeGameIfOnePlayerRemains(draft: MutableGameState, events: DomainEvent[]): boolean {
  const active = [...activePlayerIds(draft)];
  if (active.length > 1) return false;
  if (active.length === 1) {
    const loserId = active[0]!;
    const loser = draft.players.get(loserId)!;
    loser.status = 'ELIMINATED';
    loser.rank = draft.rankings.length + 1;
    draft.rankings.push(loserId);
    events.push({ type: 'PlayerRanked', playerId: loserId, rank: loser.rank, isLoser: true });
    events.push({ type: 'GameEnded', loserId });
  }
  draft.phase = 'GAME_END';
  draft.currentPlayerId = undefined;
  draft.roundLockedRank = undefined;
  draft.lastPlay = undefined;
  draft.lastPlayedBy = undefined;
  draft.discardPile.push(...draft.playingPile);
  draft.playingPile = [];
  return true;
}

function activePlayerIds(state: Pick<GameState, 'players'>): Set<string> {
  return new Set([...state.players.values()].filter((player) => player.status !== 'ELIMINATED').map((player) => player.id));
}

interface MutableGameState {
  roomId: string; numberOfDecks: 1 | 2; phase: GameState['phase']; seatingOrder: string[];
  players: Map<string, MutableGamePlayer>; reservePile: Card[]; playingPile: Card[]; discardPile: Card[];
  currentPlayerId: string | undefined; roundLockedRank: Rank | undefined; lastPlay: LastPlay | undefined; lastPlayedBy: string | undefined; rankings: string[]; roundNumber: number;
}

interface MutableGamePlayer {
  id: string; username: string; hand: Card[]; status: GamePlayer['status']; rank?: number;
}

function cloneState(state: GameState): MutableGameState {
  return {
    ...state,
    seatingOrder: [...state.seatingOrder],
    players: new Map([...state.players.entries()].map(([id, player]) => [id, { ...player, hand: [...player.hand] }])),
    reservePile: [...state.reservePile],
    playingPile: [...state.playingPile],
    discardPile: [...state.discardPile],
    roundLockedRank: state.roundLockedRank,
    lastPlay: state.lastPlay === undefined ? undefined : { ...state.lastPlay, actualCards: [...state.lastPlay.actualCards] },
    lastPlayedBy: state.lastPlayedBy,
    currentPlayerId: state.currentPlayerId,
    rankings: [...state.rankings],
  };
}

function error(code: GameErrorCode, message: string): GameError { return { code, message }; }
