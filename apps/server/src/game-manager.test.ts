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
});
