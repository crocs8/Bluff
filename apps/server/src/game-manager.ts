import { randomBytes, randomUUID } from 'node:crypto';

import { applyAction, createGame, getPlayerView, type DomainEvent, type GameAction, type GameState, type RandomSource } from '@bluff/game-engine';
import type { DeckCount } from '@bluff/shared';

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
  constructor(private readonly random?: RandomSource, options: GameManagerOptions = {}) {
    this.now = options.now ?? Date.now;
    this.schedule = options.setTimeout ?? setTimeout;
    this.cancel = options.clearTimeout ?? clearTimeout;
    this.turnDurationMs = options.turnDurationMs ?? 45_000;
    this.onTimeout = options.onTimeout;
  }
  private readonly onTimeout: GameManagerOptions['onTimeout'];

  createRoom(username: string, socketId: string): { room: RoomSession; player: SessionPlayer } {
    const player = this.createPlayer(username, socketId);
    const room: RoomSession = { roomId: this.createRoomId(), hostPlayerId: player.id, numberOfDecks: 1, players: new Map([[player.id, player]]), game: undefined, revision: 0, turnDeadlineAt: undefined, turnTimer: undefined, turnToken: 0 };
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
    const room = this.requirePlayerRoom(playerId);
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
    return { roomId: room.roomId, hostPlayerId: room.hostPlayerId, numberOfDecks: room.numberOfDecks, gameStarted: room.game !== undefined, revision: room.revision, selfPlayerId: viewerId,
      players: [...room.players.values()].map((player) => ({ id: player.id, username: player.username, connectionStatus: player.socketId ? 'CONNECTED' : 'DISCONNECTED' })) };
  }

  getGameView(room: RoomSession, viewerId: string): GameViewEnvelope | undefined {
    if (!room.game) return undefined;
    this.expireTurnIfNeeded(room);
    const game = getPlayerView(room.game, viewerId);
    return game && { revision: room.revision, ...(room.turnDeadlineAt === undefined ? {} : { turnDeadlineAt: room.turnDeadlineAt }), game };
  }

  connectedPlayers(room: RoomSession): SessionPlayer[] { return [...room.players.values()].filter((player) => player.socketId !== undefined); }
  getRoomForPlayer(playerId: string): RoomSession | undefined { const roomId = this.playerRoomIds.get(playerId); return roomId ? this.rooms.get(roomId) : undefined; }

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
