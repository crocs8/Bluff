# BLUFF — Multiplayer Online Card Game

## 1. Project Overview

Build a production-quality real-time multiplayer web game called **Bluff**.

This is a browser-based multiplayer card game inspired by the traditional offline Bluff/Cheat card game.

The goal is to create a polished, responsive, reliable multiplayer experience that can support private rooms where players join using a room code.

The game must be designed from scratch with a clean architecture.

Do NOT copy or assume the architecture of my previous Mafia game.

The server must be authoritative for all game logic, card ownership, turns, challenges, and win/loss conditions.

The client should only display state and request actions from the server.

---

# 2. Core Technology

Use a modern JavaScript/TypeScript stack.

Preferred architecture:

## Frontend

* React
* Vite
* TypeScript
* Tailwind CSS

## Backend

* Node.js
* TypeScript
* Express
* Socket.IO

## Database

* MongoDB

## Deployment target

* Frontend: Vercel or equivalent
* Backend: Render or equivalent
* Database: MongoDB Atlas

## Development

* Git
* GitHub
* Docker where useful

Use TypeScript throughout the project unless there is a strong technical reason not to.

Do not introduce unnecessary dependencies.

Before installing a dependency, consider whether the feature can be implemented cleanly without it.

---

# 3. Most Important Architecture Rule

The backend is the source of truth.

Never trust the client for:

* card ownership
* card validity
* number of cards played
* claimed rank
* turn order
* challenge validity
* winner/loser
* game phase
* room membership
* deck contents

The client sends an action.

The server validates the action.

The server updates the authoritative game state.

The server broadcasts the resulting state/events.

---

# 4. Players

Recommended supported player range:

2–10 players.

Recommended usage:

### 1 deck

2–6 players recommended.

### 2 decks

5–10 players recommended.

The UI should show recommendations but should not necessarily prevent unusual configurations unless technically required.

---

# 5. Deck System

Use a standard 52-card deck.

Ranks:

A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K

Suits:

* Hearts
* Diamonds
* Clubs
* Spades

No jokers in V1.

The host chooses the number of decks before starting.

V1 should support:

* 1 deck = 52 cards
* 2 decks = 104 cards

Design the deck system so additional decks can be supported later without rewriting the game engine.

With 1 deck:

* 4 copies of every rank

With 2 decks:

* 8 copies of every rank

---

# 6. Card Dealing

Cards must be distributed equally.

Use:

floor(totalCards / numberOfPlayers)

Example:

52 cards / 5 players = 10 cards each.

Therefore:

5 players receive 10 cards each.

2 cards remain.

Those 2 cards are placed into the game's permanent discard/reserve pile.

Example:

52 / 6 = 8 remainder 4.

Each player gets exactly 8 cards.

4 cards go into the permanent discard/reserve pile.

Players must NEVER receive the remainder.

These leftover cards are never used for gameplay during that match.

Internally, distinguish this from the active playing pile.

Recommended naming:

* `reservePile` = leftover cards from dealing; never used during the match.
* `playingPile` = cards actually played face-down during gameplay.

Do not mix these two concepts.

---

# 7. Starting Player

After cards are dealt, randomly select one player to start.

The selected player is the first player of the first round.

---

# 8. Fundamental Bluff Rule

There is NO automatic rank progression.

Do NOT implement:

A → 2 → 3 → ... → K.

That is NOT how this version of Bluff works.

Instead, the first player who plays in a round chooses the rank for that round. That rank is then locked for every later play until the round ends.

The actual cards they play do not have to match their claim.

Every player can still bluff: the actual cards they play do not have to match the locked claim rank.

---

# 9. Playing Cards

On a player's turn, they may choose:

* minimum 1 card
* maximum 4 cards with 1 deck
* maximum 8 cards with 2 decks

Therefore:

1 deck:
1–4 cards per play.

2 decks:
1–8 cards per play.

The maximum must be dynamically determined by the number of decks.

A player can select any cards currently in their own hand.

The selected cards are then placed face-down into the active `playingPile`.

---

# 10. Claiming a Rank

After selecting cards, the player chooses the rank they are claiming.

The claim can be ANY of the 13 ranks:

A
2
3
4
5
6
7
8
9
10
J
Q
K

The claimed rank does NOT need to match the actual cards.

Examples:

Actual cards:

K♠
K♥

Claim:

"Two 3s"

This is legal.

Actual cards:

3♠
3♥

Claim:

"Two 3s"

This is truthful.

The server stores both:

* actual cards
* claimed rank

Other players must not receive the actual cards.

---

# 11. Turn Actions

When it is a player's turn, they can potentially:

1. PLAY
2. SKIP
3. CALL BLUFF

CALL BLUFF is only available if there is a previous playable claim.

A player cannot call a bluff when there is nothing to challenge.

---

# 12. Immediate-Next-Player Challenge Rule

Only the immediate next player may challenge the previous player's play.

Example:

A → B → C

A plays.

B can:

* play
* skip
* call bluff on A

If B plays:

C can:

* play
* skip
* call bluff on B

C CANNOT challenge A anymore.

Once the next player plays, the previous player's play is permanently safe from future challenges.

Example:

A plays.

B plays.

A is now safe.

C may only challenge B.

This rule is critical.

Do not allow players to challenge older plays.

---

# 13. Skip Rule

Skipping does NOT create a new initiator.

A skipped turn simply passes the opportunity to the next player.

Example:

A plays.

B skips.

C now gets the opportunity to:

* play
* skip
* challenge A

If C also skips:

A gets another opportunity.

The latest player who actually PLAYED remains the `lastPlayedBy` player.

---

# 14. Current Initiator / lastPlayedBy

The game should track:

`lastPlayedBy`

This is the player who made the most recent actual play.

Skipping does not change `lastPlayedBy`.

Whenever a player actually plays cards:

`lastPlayedBy = thatPlayer`

This variable is central to determining when a natural round ends.

---

# 15. Natural Round Ending

A round does NOT automatically end when the turn reaches the player who originally started the round.

A round ends naturally when:

1. A player has made the most recent play.
2. Every other player gets an opportunity.
3. Everyone skips.
4. The player stored in `lastPlayedBy` eventually gets their turn again.
5. `lastPlayedBy` also chooses SKIP.

At that point, nobody has introduced a new play since the last actual play.

Therefore the round ends.

Example:

A plays.

B skips.

C skips.

A gets another turn.

A skips.

The round ends.

---

# 16. Important Example

Players:

A → B → C

A plays.

B skips.

C skips.

A plays again.

B skips.

C plays.

Now:

`lastPlayedBy = C`

The round does NOT end.

The table continues:

A → B → C → ...

until C eventually gets another turn and skips without another player having played since C's previous play.

---

# 17. Challenge Resolution

If a player calls BLUFF:

Immediately stop normal turn progression.

Reveal the most recent player's actual played cards.

Compare the actual cards against the claimed rank.

A claim is truthful ONLY if every card played in that move has the claimed rank.

Example:

Claim:

"3 cards — Kings"

Actual:

K♠
K♥
K♦

Truthful.

Example:

Claim:

"3 cards — Kings"

Actual:

K♠
K♥
7♦

Bluff.

---

# 18. Successful Challenge

If the challenged player lied:

The challenged player takes the entire active `playingPile`.

The challenger successfully caught the bluff.

The round immediately ends.

The challenger becomes the starting player of the next round.

---

# 19. Failed Challenge

If the challenged player told the truth:

The challenger takes the entire active `playingPile`.

The challenge failed.

The round immediately ends.

The previously challenged player becomes the starting player of the next round.

---

# 20. Playing Pile

Every actual played card goes into:

`playingPile`

The pile is face-down during normal gameplay.

It is revealed only when a challenge occurs.

When a challenge is resolved:

The entire `playingPile` goes into the hand of the player who must take the pile.

Then:

`playingPile = []`

The reserve pile is completely separate and must never be added to the playing pile.

At every round boundary, any remaining completed-round playing cards move to a discard pile and the next round begins with an empty `playingPile`. Discarded cards are never reused in a later challenge.

---

# 21. Winning / Elimination

The game does NOT end when the first player reaches zero cards.

Instead, the game continues until only one player remains.

Example with 6 players:

1st player reaches 0 cards → 1st place
2nd player reaches 0 cards → 2nd place
3rd → 3rd
4th → 4th
5th → 5th
last remaining player → loser / 6th place

There is exactly one final loser.

All eliminated players receive a final ranking.

The scoring system will be implemented later.

Do not hardcode the scoring system yet.

---

# 22. Important Edge Case: Player Reaches Zero Cards

If a player plays their final card(s), do not automatically declare them the winner before allowing a valid challenge.

The immediate next player must still have the opportunity to challenge that final play.

If the final play is truthful:

The player is eliminated / ranked.

If the final play is a bluff and successfully challenged:

The player takes the playing pile and remains in the game.

This must be handled carefully.

---

# 23. Hidden Information

A player may see:

* their own cards
* number of cards held by other players
* current turn
* current room
* latest claim
* number of cards in the playing pile if desired
* game phase
* rankings of eliminated players

A player must NEVER receive:

* another player's actual hand
* another player's unplayed cards
* hidden cards from another player's move
* hidden reserve cards

The backend must prevent leaking hidden card information through Socket.IO payloads.

Do not send the complete game state to every client if that would reveal hidden cards.

Use player-specific state serialization where necessary.

---

# 24. Multiplayer Architecture

Use Socket.IO for real-time communication.

The server should manage:

* room creation
* room joining
* host
* lobby
* player readiness
* deck selection
* game start
* card dealing
* turns
* play actions
* skip actions
* challenge actions
* challenge resolution
* player elimination
* rankings
* reconnect handling
* game end

Use clear event names.

Prefer a structured event architecture instead of random socket events scattered throughout the code.

---

# 25. Game State

Design a clear server-side game state.

A conceptual structure could contain:

Game:

* roomId
* hostId
* players
* numberOfDecks
* phase
* deck
* reservePile
* playingPile
* currentPlayerId
* lastPlayedBy
* lastPlay
* rankings
* winner/loser state

Player:

* id
* socketId
* username
* hand
* cardCount
* status
* eliminated
* rank

Last play:

* playerId
* actualCards
* claimedRank
* cardCount
* timestamp

Do not blindly copy this structure if a better architecture is appropriate.

---

# 26. State Machine

Use explicit game phases.

Suggested phases:

LOBBY
DEALING
PLAYING
CHALLENGE_RESOLUTION
ROUND_END
GAME_END

Avoid scattered boolean flags such as:

isStarted
isPlaying
isFinished
isChallenging
etc.

Prefer an explicit state machine or clearly defined phase transitions.

---

# 27. Validation

Every action must be validated server-side.

For PLAY:

Check:

* player exists
* player is not eliminated
* it is player's turn
* game is in PLAYING phase
* selected cards belong to that player's hand
* number of selected cards is valid
* claimed rank is valid

For SKIP:

Check:

* player exists
* it is their turn
* game phase is valid

For CALL BLUFF:

Check:

* player exists
* it is their turn
* a previous play exists
* the previous play belongs to the immediately previous valid play
* the player is challenging the latest play only

Never trust client-provided card objects.

---

# 28. Turn Order

Players have a fixed clockwise order.

If:

A → B → C → D → E

then normal progression is:

A → B → C → D → E → A → ...

Skipping does not change the order.

Eliminated players must be skipped automatically.

If:

A → B → C → D

and C is eliminated:

A → B → D → A

The turn engine must handle this dynamically.

---

# 29. Reconnection

Design for players losing connection temporarily.

A player should ideally be able to reconnect to the same room/game.

Do not tie permanent game identity only to a Socket.IO socket ID.

Use a persistent player/session identifier where appropriate.

On reconnect:

* restore player's identity
* restore their private hand
* restore their game status
* send current authorized game state

Do not reveal hidden information.

The original player/session identifier is retained in browser storage so a valid session may resume after a reconnect or page reload. An invalid session must not grant access to any room.

The room host may remove another player from the room or active game, but may not remove themselves. Removing the current player immediately advances the turn and invalidates the old deadline; removing another player preserves the current turn and deadline.

Every active turn has a 45-second server-authoritative deadline. Expiry performs the normal automatic timeout transition, while the client only displays the remaining time. On an unstarted round, expiry advances the initiator without selecting a rank.

---

# 30. Error Handling

Never leave the frontend permanently stuck on something like:

"ENTERING..."

Every network/game action should have:

* success
* failure
* timeout handling

If the backend/database is unavailable, the client should display a meaningful error.

The backend must log meaningful errors.

Use structured logging where practical.

---

# 31. Database

MongoDB should NOT be used unnecessarily for the live game state if the entire match can safely exist in memory.

For V1, keep the authoritative active game state in the backend process if appropriate.

Use MongoDB for persistent data that actually needs persistence, such as:

* player accounts if implemented
* match history
* rankings
* statistics
* scores

If persistent game recovery is required later, design it explicitly.

Do not make every card action unnecessarily dependent on MongoDB.

---

# 32. Performance

The game should support real-time multiplayer without excessive database queries.

Do not write every card movement to MongoDB unless required.

Prefer in-memory state for active gameplay.

Use Socket.IO events for real-time updates.

Avoid broadcasting sensitive/private data.

---

# 33. Security

Never trust:

* card IDs sent from frontend
* claimed card counts
* claimed rank
* player turn
* room ID ownership
* host permissions

The server generates and owns the deck.

The server assigns cards.

The server determines legal actions.

The server determines challenge results.

The server determines rankings.

---

# 34. UI/UX Direction

The game should feel polished and modern.

Design inspiration:

* dark gaming interface
* clean card table
* visually distinct playing cards
* smooth animations
* clear turn indicator
* dramatic BLUFF reveal
* responsive desktop/mobile design

Avoid clutter.

The player should always understand:

1. Whose turn it is.
2. What the previous player claimed.
3. How many cards each player has.
4. What actions are currently available.
5. Whether they can challenge.
6. What happened after a challenge.

---

# 35. Lobby

The lobby should contain:

* room code
* player list
* host indicator
* number of players
* deck selection
* recommended player count
* start button for host
* ready state if appropriate

Example:

1 Deck:
"Recommended for 2–6 players"

2 Decks:
"Recommended for 5–10 players"

---

# 36. Game UI

Main areas:

* opponent/player list around table
* central playing pile
* latest claim
* current turn indicator
* player's hand
* PLAY button
* SKIP button
* CALL BLUFF button when legal
* rank selection UI
* selected card indicators
* timer if implemented

When selecting cards:

Show selected cards clearly.

When selecting a claim:

Display all 13 ranks.

The round initiator chooses the claimed rank independently of the selected cards. Later plays use the locked round rank automatically.

---

# 37. Challenge Animation

A challenge should feel dramatic.

Example flow:

Player claims:

"THREE KINGS"

Opponent clicks:

"CALL BLUFF"

Then:

CARDS REVEAL

Then show:

* TRUE / BLUFF
* actual cards
* who takes the pile
* who starts the next round

Use animation but never sacrifice game-state correctness.

---

# 38. Development Philosophy

Build incrementally.

Do NOT attempt to create the entire application in one giant implementation.

Work in phases.

Recommended order:

PHASE 1:
Project setup.

PHASE 2:
Deck/card engine.

PHASE 3:
Pure server-side game engine with unit tests.

PHASE 4:
Socket.IO multiplayer room system.

PHASE 5:
Lobby.

PHASE 6:
Gameplay UI.

PHASE 7:
Challenge/reveal system.

PHASE 8:
Elimination/ranking.

PHASE 9:
Reconnect/error handling.

PHASE 10:
Polish/animations.

PHASE 11:
Deployment.

---

# 39. Extremely Important Development Rule

Before implementing the UI, build and test the game rules as pure server-side logic.

The core game engine should be testable without a browser.

Create unit tests for:

* dealing
* reserve cards
* selecting valid cards
* invalid cards
* claiming ranks
* bluff detection
* challenge resolution
* skipping
* lastPlayedBy
* round ending
* turn rotation
* eliminated players
* final loser
* one deck
* two decks
* edge cases

Do not rely on manual browser testing to validate the rules.

---

# 40. First Task

Do NOT start implementing the entire game immediately.

First inspect the repository.

Then:

1. Propose the folder structure.
2. Propose the frontend/backend architecture.
3. Propose the game-state model.
4. Propose the Socket.IO event architecture.
5. Propose the game engine API.
6. Identify ambiguous edge cases that still need decisions.
7. Identify risks in the architecture.
8. Create a phased implementation plan.

Do not write the full application yet.

Wait for approval after presenting the architecture and plan.

---

# 41. Coding Standards

Use:

* TypeScript strict mode
* clear types
* small functions
* meaningful names
* no unnecessary abstractions
* no duplicated game logic
* server-authoritative state
* unit tests for game rules
* clear error handling

Avoid:

* giant files
* giant socket handlers
* business logic inside React components
* trusting frontend state
* storing secret information in client state
* unnecessary database calls
* magic numbers
* undocumented game rules

---

# 42. Final Goal

The final product should be a polished online Bluff game where players can:

1. Create a room.
2. Share the room code.
3. Join from different devices.
4. Select 1 or 2 decks.
5. Start the match.
6. Receive equally distributed cards.
7. Choose any rank to claim.
8. Play 1–4 cards with one deck.
9. Play 1–8 cards with two decks.
10. Bluff freely.
11. Skip.
12. Challenge only the immediate previous player's play.
13. Resolve challenges correctly.
14. Continue rounds until players are eliminated.
15. Rank all players.
16. Have exactly one final loser.
17. Reconnect after temporary network issues.
18. Never expose hidden cards.

The system must prioritize correctness, multiplayer reliability, security, and maintainability over rushing to create visual features.

Before every major implementation step, explain what is being changed and why.

If a requirement conflicts with this specification, ask for clarification rather than silently inventing a rule.
