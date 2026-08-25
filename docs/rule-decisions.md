# Bluff Rule Decisions

This document records the rule decisions approved after the initial architecture review. It supplements `BLUFF_SPEC.md` and does not change any other rule.

## Final plays and finishing

- A player may play all cards remaining in their hand, from one card through the deck-dependent play maximum.
- Reaching zero cards does not itself finish a player. The final play remains challengeable by the next current player under the normal rules.
- If that final play is challenged and truthful, the challenger takes the whole `playingPile`; the player finishes, receives the next placement, and is removed from active turn rotation.
- If it is challenged and a bluff, the player takes the whole `playingPile`, remains active, and the successful challenger is the intended next-round starter.
- If the next player skips, the final play becomes safe and the player finishes. A finished player never takes another turn.

## Round starters and eliminated players

- Seating order is fixed for the match. Eliminated players remain in that circular order but are skipped for every turn and starter selection.
- Whenever a rule identifies an intended next-round starter, resolve it to the first active player at or clockwise after that player in the fixed seating order.
- The game ends immediately when one active player remains. That player is the final loser and receives last place; earlier finished players retain the order in which they finished.

## First turn and challenge eligibility

- At the absolute start of the match, the randomly selected starter must play. They cannot skip because no play exists.
- The current player may challenge only the most recent actual play.
- A skip never changes the challenge target.
- A new play permanently makes all older plays unchallengeable.

## Locked round rank and turn timeout

- The first successful play of each round chooses `roundLockedRank`.
- All later plays in that round use the locked rank; their physical cards remain unrestricted.
- The rank is cleared when the round ends, and the next initiator chooses a new rank.
- Every active turn has a 45-second server-authoritative deadline.
- A normal timeout follows the existing skip behavior. If the round has no play yet, a timeout advances the initiator without selecting a rank, allowing the next player to initiate.
- The client may display the remaining deadline and may vibrate for 200ms when the local turn begins; neither affects authoritative gameplay.
