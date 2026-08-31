import { createServer, type Server as HttpServer } from 'node:http';

import { type DomainEvent, type GameAction, type RandomSource } from '@bluff/game-engine';
import express from 'express';
import { Server, type Socket } from 'socket.io';

import type { Ack, ClientToServerEvents, PublicGameEvent, ServerToClientEvents } from './contracts.js';
import { GameManager, ManagerError, type RoomSession } from './game-manager.js';

type BluffSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { playerId: string | undefined }>;

export interface BluffServer {
  readonly app: express.Express;
  readonly httpServer: HttpServer;
  readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
  readonly manager: GameManager;
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}

export function createBluffServer(options: { random?: RandomSource; now?: () => number; turnDurationMs?: number } = {}): BluffServer {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: true, credentials: false } });
  const manager = new GameManager(options.random, {
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.turnDurationMs === undefined ? {} : { turnDurationMs: options.turnDurationMs }),
    onTimeout: (room, events) => {
      emitDomainEvents(io, room, events);
      emitGameViews(io, manager, room);
    },
  });

  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok', uptime: process.uptime() }));

  io.on('connection', (socket: BluffSocket) => {
    socket.on('room:create', (payload, ack) => execute(socket, ack, () => {
      const { room, player } = manager.createRoom(payload.username, socket.id);
      socket.data.playerId = player.id;
      socket.join(room.roomId);
      emitRoomViews(io, manager, room);
      return { revision: room.revision, playerId: player.id, roomId: room.roomId };
    }));

    socket.on('room:join', (payload, ack) => execute(socket, ack, () => {
      const { room, player } = manager.joinRoom(payload.roomId, payload.username, socket.id);
      socket.data.playerId = player.id;
      socket.join(room.roomId);
      emitRoomViews(io, manager, room);
      return { revision: room.revision, playerId: player.id, roomId: room.roomId };
    }));

    socket.on('session:resume', (payload, ack) => execute(socket, ack, () => {
      const room = manager.resume(payload.playerId, socket.id);
      socket.data.playerId = payload.playerId;
      socket.join(room.roomId);
      emitRoomViews(io, manager, room);
      emitGameViews(io, manager, room);
      io.to(room.roomId).emit('connection:status', { playerId: payload.playerId, status: 'CONNECTED' });
      return { revision: room.revision, playerId: payload.playerId, roomId: room.roomId };
    }));

    socket.on('room:leave', (_payload, ack) => execute(socket, ack, () => {
      const playerId = requirePlayerId(socket);
      const room = manager.leaveRoom(playerId);
      socket.data.playerId = undefined;
      if (room) {
        socket.leave(room.roomId);
        emitRoomViews(io, manager, room);
        return { revision: room.revision };
      }
      return { revision: 0 };
    }));

    socket.on('room:remove-player', (payload, ack) => execute(socket, ack, () => {
      const requesterId = requirePlayerId(socket);
      const { room, removedPlayer, events } = manager.removePlayer(requesterId, payload.playerId);
      if (removedPlayer.socketId) {
        io.to(removedPlayer.socketId).emit('room:removed', { reason: 'PLAYER_REMOVED_BY_HOST' });
        const targetSocket = io.of('/').sockets.get(removedPlayer.socketId);
        if (targetSocket) {
          targetSocket.leave(room.roomId);
          targetSocket.data.playerId = undefined;
        }
      }
      emitDomainEvents(io, room, events);
      emitRoomViews(io, manager, room);
      emitGameViews(io, manager, room);
      return { revision: room.revision };
    }));

    socket.on('room:configure', (payload, ack) => execute(socket, ack, () => {
      const room = manager.configureRoom(requirePlayerId(socket), payload.numberOfDecks);
      emitRoomViews(io, manager, room);
      return { revision: room.revision };
    }));

    socket.on('room:start', (_payload, ack) => execute(socket, ack, () => {
      const room = manager.startRoom(requirePlayerId(socket));
      emitRoomViews(io, manager, room);
      emitGameViews(io, manager, room);
      return { revision: room.revision };
    }));

    socket.on('game:play', (payload, ack) => handleGameAction(socket, ack, { type: 'PLAY', cardIds: payload.cardIds, claimedRank: payload.claimedRank }, io, manager));
    socket.on('game:skip', (_payload, ack) => handleGameAction(socket, ack, { type: 'SKIP' }, io, manager));
    socket.on('game:call-bluff', (_payload, ack) => handleGameAction(socket, ack, { type: 'CALL_BLUFF' }, io, manager));

    socket.on('disconnect', () => {
      const disconnected = manager.disconnectSocket(socket.id);
      if (disconnected) io.to(disconnected.room.roomId).emit('connection:status', { playerId: disconnected.playerId, status: 'DISCONNECTED' });
    });
  });

  return {
    app, httpServer, io, manager,
    listen: (port = 0) => new Promise((resolve) => httpServer.listen(port, () => resolve((httpServer.address() as { port: number }).port))),
    close: () => new Promise((resolve, reject) => { manager.dispose(); io.close((error) => error ? reject(error) : resolve()); }),
  };
}

function handleGameAction(socket: BluffSocket, ack: Ack, action: GameAction, io: BluffServer['io'], manager: GameManager): void {
  execute(socket, ack, () => {
    const { room, events } = manager.applyGameAction(requirePlayerId(socket), action);
    emitDomainEvents(io, room, events);
    emitGameViews(io, manager, room);
    return { revision: room.revision };
  });
}

function execute(socket: BluffSocket, ack: Ack, action: () => { revision: number; playerId?: string; roomId?: string }): void {
  try { ack({ ok: true, ...action() }); }
  catch (cause) {
    const error = cause instanceof ManagerError ? cause : new ManagerError('INVALID_ACTION', 'The requested action could not be completed.');
    socket.emit('action:error', { code: error.code, message: error.message });
    ack({ ok: false, code: error.code, message: error.message });
  }
}

function requirePlayerId(socket: BluffSocket): string {
  if (!socket.data.playerId) throw new ManagerError('INVALID_SESSION', 'Resume or join a room before acting.');
  return socket.data.playerId;
}

function emitRoomViews(io: BluffServer['io'], manager: GameManager, room: RoomSession): void {
  for (const player of manager.connectedPlayers(room)) io.to(player.socketId!).emit('room:view', manager.getRoomView(room, player.id));
}

function emitGameViews(io: BluffServer['io'], manager: GameManager, room: RoomSession): void {
  for (const player of manager.connectedPlayers(room)) {
    const view = manager.getGameView(room, player.id);
    if (view) io.to(player.socketId!).emit('game:view', view);
  }
}

function emitDomainEvents(io: BluffServer['io'], room: RoomSession, events: DomainEvent[]): void {
  for (const event of events) {
    if (event.type === 'ChallengeResolved') {
      const pileRecipientId = event.wasTruthful ? event.challengerId : event.challengedPlayerId;
      io.to(room.roomId).emit('game:challenge-result', {
        challengerId: event.challengerId,
        challengedPlayerId: event.challengedPlayerId,
        claimedRank: event.claimedRank,
        revealedCards: event.revealedCards,
        wasTruthful: event.wasTruthful,
        pileRecipientId,
        revision: room.revision,
      });
    }
    const publicEvent: PublicGameEvent = event.type === 'ChallengeResolved'
      ? { type: event.type, challengerId: event.challengerId, challengedPlayerId: event.challengedPlayerId, wasTruthful: event.wasTruthful }
      : event;
    io.to(room.roomId).emit('game:event', { ...publicEvent, revision: room.revision });
  }
}
