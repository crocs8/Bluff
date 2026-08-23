import type { Card } from '@bluff/shared';

export interface DealResult {
  readonly handsByPlayerId: ReadonlyMap<string, Card[]>;
  readonly reservePile: Card[];
  readonly cardsPerPlayer: number;
}

export function dealEqually(cards: readonly Card[], playerIds: readonly string[]): DealResult {
  if (playerIds.length < 2) {
    throw new RangeError('At least two players are required to deal a game');
  }

  const uniquePlayerIds = new Set(playerIds);
  if (uniquePlayerIds.size !== playerIds.length) {
    throw new Error('Player IDs must be unique');
  }

  const cardsPerPlayer = Math.floor(cards.length / playerIds.length);
  const handsByPlayerId = new Map<string, Card[]>();

  for (const playerId of playerIds) {
    handsByPlayerId.set(playerId, []);
  }

  const dealtCardCount = cardsPerPlayer * playerIds.length;
  for (let cardIndex = 0; cardIndex < dealtCardCount; cardIndex += 1) {
    const playerId = playerIds[cardIndex % playerIds.length]!;
    handsByPlayerId.get(playerId)!.push(cards[cardIndex]!);
  }

  return {
    handsByPlayerId,
    reservePile: cards.slice(dealtCardCount),
    cardsPerPlayer,
  };
}
