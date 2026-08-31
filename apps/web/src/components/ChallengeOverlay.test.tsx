import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChallengeOverlay } from './ChallengeOverlay.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { ChallengeResult, GameViewEnvelope, RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('ChallengeOverlay Component', () => {
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

  it('renders animation stages and reveals BLUFF CAUGHT result with cards and correct recipient', () => {
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
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<ChallengeOverlay />);

    // Initial phase: ⚡ CHALLENGE!
    expect(screen.getByText(/CHALLENGE!/i)).toBeInTheDocument();

    // Advance to revealing
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText(/REVEALING/i)).toBeInTheDocument();

    // Advance to result
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(screen.getByText('BLUFF CAUGHT!')).toBeInTheDocument();
    expect(screen.getByText(/takes the pile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CLOSE/i })).toBeInTheDocument();
  });
});
