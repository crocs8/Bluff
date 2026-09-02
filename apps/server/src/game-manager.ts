import { randomBytes, randomUUID } from 'node:crypto';

import { applyAction, createGame, getPlayerView, nextActivePlayerId, type DomainEvent, type GameAction, type GameState, type RandomSource } from '@bluff/game-engine';
import { type DeckCount, type QuickChatMessageId, QUICK_CHAT_IDS } from '@bluff/shared';

import type { GameViewEnvelope, RoomView } from './contracts.js';

export interface SessionPlayer {
  readonly id: string;
  readonly username: string;
  socketId: string | undefined;
}

export interface RoomSession {
  readonly roomId: string;
  hostPlayerId: string;
  numberOfDecks: DeckCount;
  readonly players: Map<string, SessionPlayer>;
  readonly removedPlayerIds: Set<string>;
  game: GameState | undefined;
  revision: number;
  turnDeadlineAt: number | undefined;
  turnTimer: ReturnType<typeof setTimeout> | undefined;
  turnToken: number;
}

export interface GameManagerOptions {
  readonly now?: () => number;
  readonly setTimeout?: typeof setTimeout;
  readonly clearTimeout?: typeof clearTimeout;
  readonly turnDurationMs?: number;
  readonly onTimeout?: (room: RoomSession, events: DomainEvent[]) => void;
}

export class ManagerError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

export class GameManager {
  private readonly rooms = new Map<string, RoomSession>();
  private readonly playerRoomIds = new Map<string, string>();
  private readonly now: () => number;
  private readonly schedule: typeof setTimeout;
  private readonly cancel: typeof clearTimeout;
  private readonly turnDurationMs: number;
  private readonly onTimeout: GameManagerOptions['onTimeout'];

  constructor(private readonly random?: RandomSource, options: GameManagerOptions = {}) {
    this.now = options.now ?? Date.now;
    this.schedule = options.setTimeout ?? setTimeout;
    this.cancel = options.clearTimeout ?? clearTimeout;
    this.turnDurationMs = options.turnDurationMs ?? 30_000;
    this.onTimeout = options.onTimeout;
  }

  createRoom(username: string, socketId: string): { room: RoomSession; player: SessionPlayer } {
    const player = this.createPlayer(username, socketId);
    const room: RoomSession = {
      roomId: this.createRoomId(),
      hostPlayerId: player.id,
      numberOfDecks: 1,
      players: new Map([[player.id, player]]),
      removedPlayerIds: new Set<string>(),
      game: undefined,
      revision: 0,
      turnDeadlineAt: undefined,
      turnTimer: undefined,
      turnToken: 0,
    };
    this.rooms.set(room.roomId, room);
    this.playerRoomIds.set(player.id, room.roomId);
    return { room, player };
  }

  joinRoom(roomId: string, username: string, socketId: string): { room: RoomSession; player: SessionPlayer } {
    const room = this.requireRoom(roomId);
    if (room.game) throw new ManagerError('GAME_ALREADY_STARTED', 'This game has already started.');
    if (room.players.size >= 10) throw new ManagerError('ROOM_FULL', 'This room is full.');
    const player = this.createPlayer(username, socketId);
    room.players.set(player.id, player);
    room.revision += 1;
    this.playerRoomIds.set(player.id, room.roomId);
    return { room, player };
  }

  leaveRoom(playerId: string): RoomSession | undefined {
    const room = this.getRoomForPlayer(playerId);
    if (!room) return undefined;
    if (room.game) throw new ManagerError('GAME_ALREADY_STARTED', 'Players cannot leave an active game.');
    room.players.delete(playerId);
    this.playerRoomIds.delete(playerId);
    room.revision += 1;
    if (room.hostPlayerId === playerId && room.players.size > 0) room.hostPlayerId = room.players.keys().next().value!;
    if (room.players.size === 0) this.rooms.delete(room.roomId);
    return room;
  }

  removePlayer(requesterPlayerId: string, targetPlayerId: string): { room: RoomSession; removedPlayer: SessionPlayer; events: DomainEvent[] } {
    const room = this.requirePlayerRoom(requesterPlayerId);
    if (room.hostPlayerId !== requesterPlayerId) {
      throw new ManagerError('NOT_HOST', 'Only the host can remove players.');
    }
    if (requesterPlayerId === targetPlayerId) {
      throw new ManagerError('INVALID_ACTION', 'The host cannot remove themselves.');
    }
    const target = room.players.get(targetPlayerId);
    if (!target) {
      throw new ManagerError('PLAYER_NOT_FOUND', 'Target player was not found in this room.');
    }

    room.removedPlayerIds.add(targetPlayerId);
    room.players.delete(targetPlayerId);
    this.playerRoomIds.delete(targetPlayerId);

    const events: DomainEvent[] = [];

    if (room.game) {
      this.expireTurnIfNeeded(room);
      if (room.game.phase === 'PLAYING') {
        const isCurrentPlayer = room.game.currentPlayerId === targetPlayerId;
        const targetGamePlayer = room.game.players.get(targetPlayerId);

        const nextPlayers = new Map(room.game.players);
        const nextDiscardPile = [...room.game.discardPile];

        if (targetGamePlayer) {
          if (targetGamePlayer.hand.length > 0) {
            nextDiscardPile.push(...targetGamePlayer.hand);
          }
          nextPlayers.set(targetPlayerId, {
            ...targetGamePlayer,
            hand: [],
            status: 'ELIMINATED',
          });
        }

        const activeIds = new Set(
          [...nextPlayers.values()]
            .filter((p) => p.status !== 'ELIMINATED' && p.id !== targetPlayerId)
            .map((p) => p.id),
        );

        let nextCurrentPlayerId = room.game.currentPlayerId;
        let nextPhase: GameState['phase'] = room.game.phase;
        let nextLastPlay = room.game.lastPlay;
        let nextLastPlayedBy = room.game.lastPlayedBy;
        let nextRoundLockedRank = room.game.roundLockedRank;
        const nextRankings = [...room.game.rankings];

        if (activeIds.size <= 1) {
          nextPhase = 'GAME_END';
          nextCurrentPlayerId = undefined;
          nextRoundLockedRank = undefined;
          nextLastPlay = undefined;
          nextLastPlayedBy = undefined;
          if (activeIds.size === 1) {
            const loserId = [...activeIds][0]!;
            const remainingPlayer = nextPlayers.get(loserId)!;
            nextPlayers.set(loserId, { ...remainingPlayer, status: 'ELIMINATED', rank: nextRankings.length + 1 });
            nextRankings.push(loserId);
            events.push({ type: 'PlayerRanked', playerId: loserId, rank: nextRankings.length, isLoser: true });
            events.push({ type: 'GameEnded', loserId });
          }
          this.cancelTurn(room);
        } else if (isCurrentPlayer) {
          this.cancelTurn(room);
          nextCurrentPlayerId = nextActivePlayerId(room.game.seatingOrder, activeIds, targetPlayerId);
        }

        room.game = {
          ...room.game,
          phase: nextPhase,
          players: nextPlayers,
          discardPile: nextDiscardPile,
          currentPlayerId: nextCurrentPlayerId,
          lastPlay: nextLastPlay,
          lastPlayedBy: nextLastPlayedBy,
          roundLockedRank: nextRoundLockedRank,
          rankings: nextRankings,
        };

        if (isCurrentPlayer && room.game.phase === 'PLAYING') {
          this.scheduleTurn(room);
        }
      }
    }

    room.revision += 1;
    return { room, removedPlayer: target, events };
  }

  configureRoom(playerId: string, numberOfDecks: DeckCount): RoomSession {
    const room = this.requirePlayerRoom(playerId);
    if (room.game) throw new ManagerError('GAME_ALREADY_STARTED', 'The game has already started.');
    if (room.hostPlayerId !== playerId) throw new ManagerError('NOT_HOST', 'Only the host can configure the room.');
    if (numberOfDecks !== 1 && numberOfDecks !== 2) throw new ManagerError('INVALID_DECK_COUNT', 'Deck count must be 1 or 2.');
    room.numberOfDecks = numberOfDecks;
    room.revision += 1;
    return room;
  }

  startRoom(playerId: string): RoomSession {
    const room = this.requirePlayerRoom(playerId);
    if (room.game) throw new ManagerError('GAME_ALREADY_STARTED', 'The game has already started.');
    if (room.hostPlayerId !== playerId) throw new ManagerError('NOT_HOST', 'Only the host can start the game.');
    if (room.players.size < 2) throw new ManagerError('INVALID_ROOM', 'At least two players are required.');
    room.game = createGame({ roomId: room.roomId, numberOfDecks: room.numberOfDecks, players: [...room.players.values()].map(({ id, username }) => ({ id, username })), ...(this.random === undefined ? {} : { random: this.random }) });
    room.revision += 1;
    this.scheduleTurn(room);
    return room;
  }

  applyGameAction(playerId: string, action: GameAction): { room: RoomSession; events: DomainEvent[] } {
    const room = this.requirePlayerRoom(playerId);
    if (!room.game) throw new ManagerError('INVALID_ACTION', 'The game has not started.');
    this.expireTurnIfNeeded(room);
    const result = applyAction(room.game, playerId, action);
    if (!result.ok) throw new ManagerError(result.error.code, result.error.message);
    room.game = result.state;
    room.revision += 1;
    this.scheduleTurn(room);
    return { room, events: result.events };
  }

  resume(playerId: string, socketId: string): RoomSession {
    const roomId = this.playerRoomIds.get(playerId);
    if (!roomId) {
      // Check if player was removed
      for (const r of this.rooms.values()) {
        if (r.removedPlayerIds.has(playerId)) {
          throw new ManagerError('PLAYER_REMOVED', 'You have been removed by the host.');
        }
      }
      throw new ManagerError('INVALID_SESSION', 'Player has no active room session.');
    }
    const room = this.rooms.get(roomId);
    if (!room) throw new ManagerError('INVALID_SESSION', 'Room does not exist.');
    if (room.removedPlayerIds.has(playerId)) {
      throw new ManagerError('PLAYER_REMOVED', 'You have been removed by the host.');
    }
    if (room.game && room.game.phase === 'GAME_END') {
      throw new ManagerError('GAME_ENDED', 'This game has ended.');
    }
    this.expireTurnIfNeeded(room);
    const player = room.players.get(playerId);
    if (!player) throw new ManagerError('INVALID_SESSION', 'Session is not valid for this room.');
    player.socketId = socketId;
    return room;
  }

  disconnectSocket(socketId: string): { room: RoomSession; playerId: string } | undefined {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          player.socketId = undefined;
          return { room, playerId: player.id };
        }
      }
    }
    return undefined;
  }

  getRoomView(room: RoomSession, viewerId: string): RoomView {
    return {
      roomId: room.roomId,
      hostPlayerId: room.hostPlayerId,
      numberOfDecks: room.numberOfDecks,
      gameStarted: room.game !== undefined,
      revision: room.revision,
      selfPlayerId: viewerId,
      players: [...room.players.values()].map((player) => ({
        id: player.id,
        username: player.username,
        connectionStatus: player.socketId ? 'CONNECTED' : 'DISCONNECTED',
      })),
    };
  }

  getGameView(room: RoomSession, viewerId: string): GameViewEnvelope | undefined {
    if (!room.game) return undefined;
    this.expireTurnIfNeeded(room);
    const game = getPlayerView(room.game, viewerId);
    return game && { revision: room.revision, ...(room.turnDeadlineAt === undefined ? {} : { turnDeadlineAt: room.turnDeadlineAt }), game };
  }

  connectedPlayers(room: RoomSession): SessionPlayer[] { return [...room.players.values()].filter((player) => player.socketId !== undefined); }
  getRoomForPlayer(playerId: string): RoomSession | undefined { const roomId = this.playerRoomIds.get(playerId); return roomId ? this.rooms.get(roomId) : undefined; }

  sendQuickChat(playerId: string, messageId: string): { room: RoomSession; messageId: QuickChatMessageId } {
    const room = this.requirePlayerRoom(playerId);
    if (!QUICK_CHAT_IDS.includes(messageId as QuickChatMessageId)) {
      throw new ManagerError('INVALID_ACTION', 'Invalid quick chat message.');
    }
    return { room, messageId: messageId as QuickChatMessageId };
  }

  dispose(): void {
    for (const room of this.rooms.values()) this.cancelTurn(room);
  }

  private expireTurnIfNeeded(room: RoomSession): void {
    if (!room.game || room.turnDeadlineAt === undefined || room.turnDeadlineAt > this.now()) return;
    this.cancelTurn(room);
    const playerId = room.game.currentPlayerId;
    if (!playerId) return;
    const result = applyAction(room.game, playerId, { type: 'TIMEOUT' });
    if (!result.ok) return;
    room.game = result.state;
    room.revision += 1;
    this.scheduleTurn(room);
    this.onTimeout?.(room, result.events);
  }

  private scheduleTurn(room: RoomSession): void {
    this.cancelTurn(room);
    if (!room.game || room.game.phase !== 'PLAYING' || room.game.currentPlayerId === undefined) return;
    const token = room.turnToken;
    room.turnDeadlineAt = this.now() + this.turnDurationMs;
    const deadline = room.turnDeadlineAt;
    room.turnTimer = this.schedule(() => {
      if (room.turnToken !== token || room.turnDeadlineAt !== deadline) return;
      this.expireTurnIfNeeded(room);
    }, this.turnDurationMs);
  }

  private cancelTurn(room: RoomSession): void {
    if (room.turnTimer !== undefined) this.cancel(room.turnTimer);
    room.turnTimer = undefined;
    room.turnDeadlineAt = undefined;
    room.turnToken += 1;
  }

  private createPlayer(username: string, socketId: string): SessionPlayer {
    const normalized = username.trim();
    if (normalized.length < 1 || normalized.length > 24) throw new ManagerError('INVALID_ACTION', 'Username must be between 1 and 24 characters.');
    return { id: randomUUID(), username: normalized, socketId };
  }
  private createRoomId(): string { let id: string; do { id = randomBytes(4).toString('hex').toUpperCase(); } while (this.rooms.has(id)); return id; }
  private requireRoom(roomId: string): RoomSession { const room = this.rooms.get(roomId.toUpperCase()); if (!room) throw new ManagerError('ROOM_NOT_FOUND', 'Room was not found.'); return room; }
  private requirePlayerRoom(playerId: string): RoomSession { const room = this.getRoomForPlayer(playerId); if (!room) throw new ManagerError('INVALID_SESSION', 'Player has no active room session.'); return room; }
}
