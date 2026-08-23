import { RANKS, SUITS, type Card, type DeckCount } from '@bluff/shared';

export function createDeck(deckCount: DeckCount): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `deck-${deckIndex}-${suit}-${rank}`,
          deckIndex,
          suit,
          rank,
        });
      }
    }
  }

  return cards;
}
