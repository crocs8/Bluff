import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameManager } from './game-manager.js';

const alwaysZero = { nextInt: () => 0 };

describe('GameManager turn deadlines', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a deadline and advances an unstarted round once on first-turn expiry', () => {
    vi.useFakeTimers();
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    const joined = manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const room = manager.startRoom(created.player.id);

    expect(room.turnDeadlineAt).toBe(Date.now() + 45_000);
    vi.advanceTimersByTime(45_000);

    expect(room.revision).toBe(3);
    expect(room.game?.currentPlayerId).toBe(joined.player.id);
    expect(room.game?.roundLockedRank).toBeUndefined();
    manager.dispose();
  });

  it('invalidates the old timer after a manual action', () => {
    vi.useFakeTimers();
    const manager = new GameManager(alwaysZero);
    const created = manager.createRoom('Ada', 'socket-a');
    manager.joinRoom(created.room.roomId, 'Ben', 'socket-b');
    const room = manager.startRoom(created.player.id);
    const cardId = room.game!.players.get(created.player.id)!.hand[0]!.id;

    manager.applyGameAction(created.player.id, { type: 'PLAY', cardIds: [cardId], claimedRank: 'A' });
    expect(room.revision).toBe(3);
    expect(room.game?.currentPlayerId).not.toBe(created.player.id);

    vi.advanceTimersByTime(45_000);
    expect(room.revision).toBe(4);
    manager.dispose();
  });

  it('allows only the host to remove another player and advances an active removed turn', () => {
    vi.useFakeTimers();
    const manager = new GameManager({ nextInt: (upperExclusive) => upperExclusive <= 1 ? 0 : 1 });
    const host = manager.createRoom('Ada', 'socket-a');
    const target = manager.joinRoom(host.room.roomId, 'Ben', 'socket-b');
    const other = manager.joinRoom(host.room.roomId, 'Cam', 'socket-c');
    const room = manager.startRoom(host.player.id);

    expect(() => manager.removePlayer(target.player.id, other.player.id)).toThrow('Only the host');
    expect(() => manager.removePlayer(host.player.id, host.player.id)).toThrow('cannot remove');
    const currentId = room.game!.currentPlayerId!;
    const removable = currentId === target.player.id ? target.player : other.player;
    const before = room.revision;
    const result = manager.removePlayer(host.player.id, removable.id);

    expect(result.room.revision).toBe(before + 1);
    expect(result.room.players.has(removable.id)).toBe(false);
    expect(result.room.game?.currentPlayerId).not.toBe(removable.id);
    expect(result.room.game?.discardPile.length).toBeGreaterThan(0);
    manager.dispose();
  });

  it('does not allow a host to remove a player from another room', () => {
    const manager = new GameManager(alwaysZero);
    const first = manager.createRoom('Ada', 'socket-a');
    const second = manager.createRoom('Bea', 'socket-b');
    expect(() => manager.removePlayer(first.player.id, second.player.id)).toThrow('does not belong');
    manager.dispose();
  });
});
