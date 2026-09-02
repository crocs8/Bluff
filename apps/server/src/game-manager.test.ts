import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameManager } from './game-manager.js';

const alwaysZero = { nextInt: () => 0 };

describe('GameManager turn deadlines, quick chat, and player management', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a 30-second deadline and advances an unstarted round once on first-turn expiry', () => {
    vi.useFakeTimers();
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    const joined = manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const room = manager.startRoom(created.player.id);

    expect(room.turnDeadlineAt).toBe(Date.now() + 30_000);
    vi.advanceTimersByTime(30_000);

    expect(room.revision).toBe(3);
    expect(room.game?.currentPlayerId).toBe(joined.player.id);
    expect(room.game?.roundLockedRank).toBeUndefined();
    manager.dispose();
  });

  it('invalidates the old timer after a manual action and sets new 30-second deadline', () => {
    vi.useFakeTimers();
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const room = manager.startRoom(created.player.id);
    const cardId = room.game!.players.get(created.player.id)!.hand[0]!.id;

    manager.applyGameAction(created.player.id, { type: 'PLAY', cardIds: [cardId], claimedRank: 'A' });
    expect(room.revision).toBe(3);
    expect(room.game?.currentPlayerId).not.toBe(created.player.id);

    vi.advanceTimersByTime(30_000);
    expect(room.revision).toBe(4);
    manager.dispose();
  });

  it('validates and sends quick chat messages without modifying game state', () => {
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const room = manager.startRoom(created.player.id);
    const initialRev = room.revision;

    // Valid quick chat message
    const res = manager.sendQuickChat(created.player.id, 'PAKADO');
    expect(res.messageId).toBe('PAKADO');
    expect(res.room.roomId).toBe(room.roomId);
    expect(room.revision).toBe(initialRev); // Game state not mutated

    // Invalid quick chat message rejected
    expect(() => manager.sendQuickChat(created.player.id, 'INVALID_CHAT_ID')).toThrowError('Invalid quick chat message.');

    // Unknown player cannot send
    expect(() => manager.sendQuickChat('non-existent-player', 'PAKADO')).toThrowError('Player has no active room session.');

    manager.dispose();
  });

  it('allows host to remove player, advances turn immediately if current, and prevents resume', () => {
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    const joinedB = manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const joinedC = manager.joinRoom(created.room.roomId, 'Charlie', 'socket-c');
    const room = manager.startRoom(created.player.id);

    // Initial current player is Ada (index 0 with alwaysZero)
    expect(room.game?.currentPlayerId).toBe(created.player.id);

    // Ada (host) removes Ben (non-current)
    const resB = manager.removePlayer(created.player.id, joinedB.player.id);
    expect(resB.room.players.has(joinedB.player.id)).toBe(false);
    expect(resB.room.game?.players.get(joinedB.player.id)?.status).toBe('ELIMINATED');
    // Turn still on Ada
    expect(resB.room.game?.currentPlayerId).toBe(created.player.id);

    // Non-host cannot remove
    expect(() => manager.removePlayer(joinedC.player.id, created.player.id)).toThrowError('Only the host can remove players.');

    // Host cannot remove self
    expect(() => manager.removePlayer(created.player.id, created.player.id)).toThrowError('The host cannot remove themselves.');

    // Removed player cannot resume
    expect(() => manager.resume(joinedB.player.id, 'socket-b2')).toThrowError('You have been removed by the host.');

    manager.dispose();
  });
});
