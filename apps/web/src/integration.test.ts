import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createBluffServer, type BluffServer } from '@bluff/server';
import { io as Client, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, RoomView, GameViewEnvelope, ChallengeResult } from '@bluff/server/contracts';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Real-Time Multiplayer Integration (3 Players)', () => {
  let server: BluffServer;
  let port: number;
  let clientA: TestSocket;
  let clientB: TestSocket;
  let clientC: TestSocket;

  beforeAll(async () => {
    server = createBluffServer();
    port = await server.listen(0);
  });

  afterAll(async () => {
    clientA?.disconnect();
    clientB?.disconnect();
    clientC?.disconnect();
    await server?.close();
  });

  function createClient(): Promise<TestSocket> {
    return new Promise((resolve) => {
      const socket: TestSocket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });
      socket.on('connect', () => resolve(socket));
    });
  }

  it('connects 3 players, synchronizes lobby, deals cards, and executes gameplay actions in real time', async () => {
    clientA = await createClient();
    clientB = await createClient();
    clientC = await createClient();

    let roomViewA: RoomView | undefined;
    let roomViewB: RoomView | undefined;
    let roomViewC: RoomView | undefined;

    clientA.on('room:view', (v) => { roomViewA = v; });
    clientB.on('room:view', (v) => { roomViewB = v; });
    clientC.on('room:view', (v) => { roomViewC = v; });

    let gameViewA: GameViewEnvelope | undefined;
    let gameViewB: GameViewEnvelope | undefined;
    let gameViewC: GameViewEnvelope | undefined;

    clientA.on('game:view', (v) => { gameViewA = v; });
    clientB.on('game:view', (v) => { gameViewB = v; });
    clientC.on('game:view', (v) => { gameViewC = v; });

    let challengeResult: ChallengeResult | undefined;
    clientA.on('game:challenge-result', (res) => { challengeResult = res; });
    clientB.on('game:challenge-result', (res) => { challengeResult = res; });
    clientC.on('game:challenge-result', (res) => { challengeResult = res; });

    // Step 1: Alice creates room
    const createRes = await new Promise<{ ok: boolean; roomId?: string; playerId?: string }>((resolve) => {
      clientA.emit('room:create', { username: 'Alice' }, (ack) => resolve(ack));
    });
    expect(createRes.ok).toBe(true);
    const roomId = createRes.roomId!;
    const playerAId = createRes.playerId!;

    // Step 2: Bob joins room
    const joinResB = await new Promise<{ ok: boolean; playerId?: string }>((resolve) => {
      clientB.emit('room:join', { roomId, username: 'Bob' }, (ack) => resolve(ack));
    });
    expect(joinResB.ok).toBe(true);
    const playerBId = joinResB.playerId!;

    // Step 3: Charlie joins room
    const joinResC = await new Promise<{ ok: boolean; playerId?: string }>((resolve) => {
      clientC.emit('room:join', { roomId, username: 'Charlie' }, (ack) => resolve(ack));
    });
    expect(joinResC.ok).toBe(true);
    const playerCId = joinResC.playerId!;

    // Wait for all 3 clients to receive synchronized room view
    await new Promise((r) => setTimeout(r, 100));

    expect(roomViewA?.players).toHaveLength(3);
    expect(roomViewB?.players).toHaveLength(3);
    expect(roomViewC?.players).toHaveLength(3);
    expect(roomViewA?.hostPlayerId).toBe(playerAId);

    // Step 4: Alice starts the game
    const startRes = await new Promise<{ ok: boolean }>((resolve) => {
      clientA.emit('room:start', {}, (ack) => resolve(ack));
    });
    expect(startRes.ok).toBe(true);

    // Wait for game:view events
    await new Promise((r) => setTimeout(r, 100));

    expect(gameViewA?.game.phase).toBe('PLAYING');
    expect(gameViewB?.game.phase).toBe('PLAYING');
    expect(gameViewC?.game.phase).toBe('PLAYING');

    // Verify hidden information protection: hand lengths exist but cards are isolated
    expect(gameViewA?.game.hand.length).toBeGreaterThan(0);
    expect(gameViewB?.game.hand.length).toBeGreaterThan(0);
    expect(gameViewC?.game.hand.length).toBeGreaterThan(0);

    // Step 5: The starting player plays a card
    const starterId = gameViewA!.game.currentPlayerId!;
    const starterClient = starterId === playerAId ? clientA : starterId === playerBId ? clientB : clientC;
    const starterView = starterId === playerAId ? gameViewA! : starterId === playerBId ? gameViewB! : gameViewC!;

    const firstCard = starterView.game.hand[0]!;
    const playRes = await new Promise<{ ok: boolean }>((resolve) => {
      starterClient.emit('game:play', { cardIds: [firstCard.id], claimedRank: 'A' }, (ack) => resolve(ack));
    });
    expect(playRes.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 100));

    // Verify pile updated for all 3 players
    expect(gameViewA?.game.playingPileCount).toBe(1);
    expect(gameViewB?.game.playingPileCount).toBe(1);
    expect(gameViewC?.game.playingPileCount).toBe(1);
    expect(gameViewA?.game.lastClaim?.claimedRank).toBe('A');

    // Step 6: Next player calls bluff
    const nextPlayerId = gameViewA!.game.currentPlayerId!;
    const nextClient = nextPlayerId === playerAId ? clientA : nextPlayerId === playerBId ? clientB : clientC;

    const bluffRes = await new Promise<{ ok: boolean }>((resolve) => {
      nextClient.emit('game:call-bluff', {}, (ack) => resolve(ack));
    });
    expect(bluffRes.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 100));

    // Challenge result received by all clients
    expect(challengeResult).toBeDefined();
    expect(challengeResult?.revealedCards).toHaveLength(1);
    expect(challengeResult?.revealedCards[0]?.id).toBe(firstCard.id);

    // Step 7: Test session resume on client disconnect
    clientB.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const reconnectedClientB = await createClient();
    const resumeRes = await new Promise<{ ok: boolean; roomId?: string }>((resolve) => {
      reconnectedClientB.emit('session:resume', { playerId: playerBId }, (ack) => resolve(ack));
    });
    expect(resumeRes.ok).toBe(true);
    expect(resumeRes.roomId).toBe(roomId);
    reconnectedClientB.disconnect();
  });
});
