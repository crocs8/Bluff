import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TableCenter } from './TableCenter.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { ChallengeResult, GameViewEnvelope, RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('In-Table Challenge & Bluff Reveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockRoom: RoomView = {
    roomId: 'ROOM1',
    hostPlayerId: 'p1',
    numberOfDecks: 1,
    gameStarted: true,
    revision: 5,
    selfPlayerId: 'p1',
    players: [
      { id: 'p1', username: 'Alice', connectionStatus: 'CONNECTED' },
      { id: 'p2', username: 'Bob', connectionStatus: 'CONNECTED' },
    ],
  };

  const mockGame: GameViewEnvelope = {
    revision: 5,
    game: {
      roomId: 'ROOM1',
      phase: 'PLAYING',
      roundNumber: 2,
      seatingOrder: ['p1', 'p2'],
      currentPlayerId: 'p1',
      players: [
        { id: 'p1', username: 'Alice', status: 'CONNECTED', cardCount: 4 },
        { id: 'p2', username: 'Bob', status: 'CONNECTED', cardCount: 4 },
      ],
      hand: [],
      playingPileCount: 2,
      rankings: [],
      legalActions: {
        canPlay: true,
        canSkip: false,
        canCallBluff: false,
        maxPlayCards: 4,
      },
    },
  };

  const mockBluffChallenge: ChallengeResult = {
    challengerId: 'p1',
    challengedPlayerId: 'p2',
    claimedRank: 'A',
    revealedCards: [
      { id: 'c1', rank: 'K', suit: 'hearts', deckIndex: 0 },
      { id: 'c2', rank: 'Q', suit: 'spades', deckIndex: 0 },
    ],
    wasTruthful: false,
    pileRecipientId: 'p2',
    revision: 5,
  };

  it('renders in-table announcement and reveals BLUFF CAUGHT result directly on table', () => {
    const mockClearChallenge = vi.fn();
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: mockRoom,
      game: mockGame,
      challenge: mockBluffChallenge,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      create: vi.fn(),
      join: vi.fn(),
      configure: vi.fn(),
      start: vi.fn(),
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: vi.fn(),
      resetSession: vi.fn(),
      clearChallenge: mockClearChallenge,
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<TableCenter />);

    // Initial announcement on table
    expect(screen.getByText(/Alice called BLUFF!/i)).toBeInTheDocument();

    // Advance timers for flip and result
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/RESULT: CLAIM WAS FALSE/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob takes the pile/i)).toBeInTheDocument();

    // Auto-dismiss after 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(mockClearChallenge).toHaveBeenCalled();
  });
});
