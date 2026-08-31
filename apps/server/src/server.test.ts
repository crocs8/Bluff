import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';

import { createBluffServer, type BluffServer } from './server.js';

const alwaysZero = { nextInt: () => 0 };

type AckResult = { ok: boolean; revision?: number; playerId?: string; roomId?: string; code?: string; message?: string };

let server: BluffServer;
let url: string;
const clients: Socket[] = [];

beforeEach(async () => {
  server = createBluffServer({ random: alwaysZero });
  url = `http://127.0.0.1:${await server.listen()}`;
});

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await server.close();
});

function connect(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const client = io(url, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
}

function once<T>(client: Socket, event: string): Promise<T> {
  return new Promise((resolve) => client.once(event, (payload: T) => resolve(payload)));
}

function onceMatching<T>(client: Socket, event: string, predicate: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const handler = (payload: T) => { if (predicate(payload)) { client.off(event, handler); resolve(payload); } };
    client.on(event, handler);
  });
}

function emitAck(client: Socket, event: string, payload: object): Promise<AckResult> {
  return new Promise((resolve) => client.emit(event, payload, (ack: AckResult) => resolve(ack)));
}

async function createRoom(client: Socket, username: string): Promise<AckResult> {
  const view = once<{ roomId: string }>(client, 'room:view');
  const ack = await emitAck(client, 'room:create', { username });
  await view;
  return ack;
}

describe('real-time room and game synchronization', () => {
  it('serves the health endpoint', async () => {
    const response = await fetch(`${url}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('creates rooms, joins them, broadcasts lobby changes, and isolates rooms', async () => {
    const a = await connect();
    const b = await connect();
    const outsider = await connect();
    const created = await createRoom(a, 'Ada');
    const aView = once<{ players: unknown[]; numberOfDecks: number }>(a, 'room:view');
    const bView = once<{ players: unknown[] }>(b, 'room:view');
    const joined = await emitAck(b, 'room:join', { roomId: created.roomId!, username: 'Ben' });
    expect(joined.ok).toBe(true);
    expect((await aView).players).toHaveLength(2);
    expect((await bView).players).toHaveLength(2);

    const outsiderCreated = await createRoom(outsider, 'Outside');
    expect(outsiderCreated.roomId).not.toBe(created.roomId);
    const configA = once<{ numberOfDecks: number }>(a, 'room:view');
    const configB = once<{ numberOfDecks: number }>(b, 'room:view');
    expect(await emitAck(a, 'room:configure', { numberOfDecks: 2 })).toMatchObject({ ok: true });
    expect((await configA).numberOfDecks).toBe(2);
    expect((await configB).numberOfDecks).toBe(2);
  });

  it('starts a game, sends individualized views, synchronizes play, and reveals only challenged cards with pileRecipientId', async () => {
    const a = await connect();
    const b = await connect();
    const room = await createRoom(a, 'Ada');
    const joined = await emitAck(b, 'room:join', { roomId: room.roomId!, username: 'Ben' });
    const aGame = once<{ game: { hand: Array<{ id: string; rank: string }> } }>(a, 'game:view');
    const bGame = once<{ game: { hand: Array<{ id: string }> } }>(b, 'game:view');
    expect(await emitAck(a, 'room:start', {})).toMatchObject({ ok: true, revision: 2 });
    const aInitial = await aGame;
    const bInitial = await bGame;
    const selected = aInitial.game.hand.find((card) => card.rank !== 'K')!;
    expect(bInitial.game.hand.map((card) => card.id)).not.toContain(selected.id);

    const aAfterPlay = once<{ revision: number; game: { currentPlayerId: string; lastClaim: unknown } }>(a, 'game:view');
    const bAfterPlay = once<{ revision: number; game: { currentPlayerId: string; lastClaim: unknown } }>(b, 'game:view');
    expect(await emitAck(a, 'game:play', { cardIds: [selected.id], claimedRank: 'K' })).toMatchObject({ ok: true, revision: 3 });
    expect((await aAfterPlay).game).toMatchObject({ currentPlayerId: joined.playerId });
    const bPlayView = await bAfterPlay;
    expect(JSON.stringify(bPlayView)).not.toContain(selected.id);

    const reveal = once<{ revealedCards: Array<{ id: string }>; wasTruthful: boolean; pileRecipientId: string }>(a, 'game:challenge-result');
    const aAfterChallenge = once<{ revision: number }>(a, 'game:view');
    const bAfterChallenge = once<{ revision: number }>(b, 'game:view');
    expect(await emitAck(b, 'game:call-bluff', {})).toMatchObject({ ok: true, revision: 4 });
    const revealPayload = await reveal;
    expect(revealPayload).toMatchObject({ wasTruthful: false, pileRecipientId: room.playerId, revealedCards: [expect.objectContaining({ id: selected.id })] });
    expect((await aAfterChallenge).revision).toBe(4);
    expect((await bAfterChallenge).revision).toBe(4);
  });

  it('pushes skip and natural-round transitions to every room participant immediately', async () => {
    const a = await connect();
    const b = await connect();
    const room = await createRoom(a, 'Ada');
    await emitAck(b, 'room:join', { roomId: room.roomId!, username: 'Ben' });
    const initial = once<{ game: { hand: Array<{ id: string }> } }>(a, 'game:view');
    await emitAck(a, 'room:start', {});
    const card = (await initial).game.hand[0]!;
    await emitAck(a, 'game:play', { cardIds: [card.id], claimedRank: 'A' });
    const afterSkipA = onceMatching<{ revision: number; game: { currentPlayerId: string } }>(a, 'game:view', (view) => view.revision === 4);
    const afterSkipB = onceMatching<{ revision: number; game: { currentPlayerId: string } }>(b, 'game:view', (view) => view.revision === 4);
    expect(await emitAck(b, 'game:skip', {})).toMatchObject({ ok: true, revision: 4 });
    expect((await afterSkipA).game.currentPlayerId).toBe(room.playerId);
    expect((await afterSkipB).revision).toBe(4);
    const roundEnded = onceMatching<{ type: string; revision: number }>(b, 'game:event', (event) => event.type === 'RoundEnded');
    expect(await emitAck(a, 'game:skip', {})).toMatchObject({ ok: true, revision: 5 });
    const event = await roundEnded;
    expect(event.revision).toBe(5);
  });

  it('allows host to remove player and broadcasts room:removed to target', async () => {
    const a = await connect();
    const b = await connect();
    const c = await connect();
    const room = await createRoom(a, 'Ada');
    const joinedB = await emitAck(b, 'room:join', { roomId: room.roomId!, username: 'Ben' });
    await emitAck(c, 'room:join', { roomId: room.roomId!, username: 'Charlie' });

    const removedEvent = once<{ reason: string }>(b, 'room:removed');
    const aRoomView = onceMatching<{ players: unknown[] }>(a, 'room:view', (v) => v.players.length === 2);

    // Host removes Ben
    const removeAck = await emitAck(a, 'room:remove-player', { playerId: joinedB.playerId! });
    expect(removeAck.ok).toBe(true);

    const removed = await removedEvent;
    expect(removed.reason).toBe('PLAYER_REMOVED_BY_HOST');
    expect((await aRoomView).players).toHaveLength(2);

    // Non-host cannot remove
    const failAck = await emitAck(c, 'room:remove-player', { playerId: room.playerId! });
    expect(failAck.ok).toBe(false);
    expect(failAck.code).toBe('NOT_HOST');
  });

  it('rejects illegal duplicate actions without advancing revision and restores an active session on resume', async () => {
    const a = await connect();
    const b = await connect();
    const room = await createRoom(a, 'Ada');
    await emitAck(b, 'room:join', { roomId: room.roomId!, username: 'Ben' });
    const initialA = once<{ game: { hand: Array<{ id: string }> } }>(a, 'game:view');
    await emitAck(a, 'room:start', {});
    const selected = (await initialA).game.hand[0]!;
    expect(await emitAck(a, 'game:play', { cardIds: [selected.id], claimedRank: 'A' })).toMatchObject({ ok: true, revision: 3 });
    expect(await emitAck(a, 'game:play', { cardIds: [selected.id], claimedRank: 'A' })).toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });

    const playerId = room.playerId!;
    a.disconnect();
    const resumed = await connect();
    const resumedView = once<{ revision: number; game: { hand: Array<{ id: string }> } }>(resumed, 'game:view');
    expect(await emitAck(resumed, 'session:resume', { playerId })).toMatchObject({ ok: true, roomId: room.roomId });
    expect((await resumedView).revision).toBe(3);
  });
});
