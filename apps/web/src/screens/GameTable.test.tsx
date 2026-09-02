import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameTable } from './GameTable.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { GameViewEnvelope, RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({ useBluffSocket: vi.fn() }));

const room: RoomView = {
  roomId: 'ROOM1', hostPlayerId: 'p1', numberOfDecks: 1, gameStarted: true, revision: 1, selfPlayerId: 'p1',
  players: [
    { id: 'p1', username: 'Alice', connectionStatus: 'CONNECTED' },
    { id: 'p2', username: 'Bob', connectionStatus: 'CONNECTED' },
    { id: 'p3', username: 'Charlie', connectionStatus: 'CONNECTED' },
  ],
};

function game(currentPlayerId: string): GameViewEnvelope {
  return {
    revision: 1,
    turnDeadlineAt: Date.now() + 30_000,
    game: {
      roomId: 'ROOM1', phase: 'PLAYING', roundNumber: 1, seatingOrder: ['p1', 'p2', 'p3'], currentPlayerId,
      players: [
        { id: 'p1', username: 'Alice', status: 'CONNECTED', cardCount: 10 },
        { id: 'p2', username: 'Bob', status: 'CONNECTED', cardCount: 10 },
        { id: 'p3', username: 'Charlie', status: 'CONNECTED', cardCount: 10 },
      ],
      hand: [{ id: 'c1', rank: 'A', suit: 'hearts', deckIndex: 0 }], playingPileCount: 0, rankings: [],
      legalActions: { canPlay: currentPlayerId === 'p1', canSkip: false, canCallBluff: false, maxPlayCards: 4 },
    },
  };
}

function socketValue(currentPlayerId: string, chatMessages: Record<string, string | undefined> = {}) {
  return {
    connection: 'CONNECTED' as const, room, game: game(currentPlayerId), challenge: undefined, lastEvent: undefined,
    error: undefined, removedNotice: undefined, submitting: false, chatMessages,
    create: vi.fn(), join: vi.fn(), configure: vi.fn(), start: vi.fn(), play: vi.fn(), skip: vi.fn(), callBluff: vi.fn(), removePlayer: vi.fn(), resetSession: vi.fn(), sendQuickChat: vi.fn(), clearChallenge: vi.fn(), clearError: vi.fn(), clearRemovedNotice: vi.fn(),
  };
}

describe('GameTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vi.fn() });
  });

  it('shows all player information, countdown, and vibrates once on a real local turn transition', () => {
    const hook = vi.mocked(SocketProviderModule.useBluffSocket);
    hook.mockReturnValue(socketValue('p2'));
    const view = render(<GameTable />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText(/Bob's Turn/)).toBeInTheDocument();

    hook.mockReturnValue(socketValue('p1'));
    view.rerender(<GameTable />);
    expect(screen.getByText(/YOUR TURN/)).toBeInTheDocument();
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);

    view.rerender(<GameTable />);
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
  });

  it('renders speech bubbles above player avatars when quick chat messages arrive', () => {
    const hook = vi.mocked(SocketProviderModule.useBluffSocket);
    hook.mockReturnValue(socketValue('p1', {
      p2: '🧢 Pakado',
      p1: '🔥 Let\'s go!',
    }));

    render(<GameTable />);
    expect(screen.getByText('🧢 Pakado')).toBeInTheDocument();
    expect(screen.getByText('🔥 Let\'s go!')).toBeInTheDocument();
  });
});
