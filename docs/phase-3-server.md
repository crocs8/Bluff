# Phase 3 Server Notes

Active Bluff rooms and games are held in the Node.js process memory by `GameManager`.

- Socket.IO is the only gameplay synchronization mechanism; clients receive pushed room, game-view, event, and challenge-result messages.
- Each connected player receives an individually serialized `getPlayerView` projection. Raw game state is never broadcast.
- A server restart currently ends all active matches. Persistent recovery, database storage, and multi-instance coordination are intentionally deferred to a later phase.
