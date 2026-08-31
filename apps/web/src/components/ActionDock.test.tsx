import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionDock } from './ActionDock.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { GameViewEnvelope, RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('ActionDock Component', () => {
  const mockPlay = vi.fn();
  const mockSkip = vi.fn();
  const mockCallBluff = vi.fn();

  const mockRoom: RoomView = {
    roomId: 'ROOM1',
    hostPlayerId: 'p1',
    numberOfDecks: 1,
    gameStarted: true,
    revision: 1,
    selfPlayerId: 'p1',
    players: [{ id: 'p1', username: 'Alice', connectionStatus: 'CONNECTED' }],
  };

  const mockGame: GameViewEnvelope = {
    revision: 1,
    game: {
      roomId: 'ROOM1',
      phase: 'PLAYING',
      roundNumber: 1,
      seatingOrder: ['p1', 'p2'],
      currentPlayerId: 'p1',
      players: [
        { id: 'p1', username: 'Alice', status: 'CONNECTED', cardCount: 2 },
        { id: 'p2', username: 'Bob', status: 'CONNECTED', cardCount: 2 },
      ],
      hand: [
        { id: 'c1', rank: 'K', suit: 'spades', deckIndex: 0 },
        { id: 'c2', rank: 'K', suit: 'hearts', deckIndex: 0 },
      ],
      playingPileCount: 0,
      rankings: [],
      legalActions: {
        canPlay: true,
        canSkip: false,
        canCallBluff: false,
        maxPlayCards: 4,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMock = {
    connection: 'CONNECTED' as const,
    room: mockRoom,
    game: mockGame,
    challenge: undefined,
    lastEvent: undefined,
    error: undefined,
    removedNotice: undefined,
    submitting: false,
    create: vi.fn(),
    join: vi.fn(),
    configure: vi.fn(),
    start: vi.fn(),
    play: mockPlay,
    skip: mockSkip,
    callBluff: mockCallBluff,
    removePlayer: vi.fn(),
    resetSession: vi.fn(),
    clearChallenge: vi.fn(),
    clearError: vi.fn(),
    clearRemovedNotice: vi.fn(),
  };

  it('renders cards in hand, rank strip, and action buttons', () => {
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue(baseMock);

    render(<ActionDock />);
    expect(screen.getByText(/Select 1 - 4 cards/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /K of/i }).length).toBe(2);
    expect(screen.getByRole('button', { name: /CALL BLUFF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SKIP/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PLAY/i })).toBeInTheDocument();
  });

  it('allows selecting card and claimed rank directly from rank strip to play', () => {
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue(baseMock);

    render(<ActionDock />);
    const cardButtons = screen.getAllByRole('button', { name: /K of/i });
    fireEvent.click(cardButtons[0]!);

    const rank3Btn = screen.getByRole('button', { name: '3' });
    fireEvent.click(rank3Btn);

    const playBtn = screen.getByRole('button', { name: /PLAY/i });
    fireEvent.click(playBtn);

    expect(mockPlay).toHaveBeenCalledWith(['c1'], '3');
  });

  it('handles SKIP action when legal', () => {
    const gameWithSkip: GameViewEnvelope = {
      ...mockGame,
      game: {
        ...mockGame.game,
        legalActions: {
          ...mockGame.game.legalActions,
          canSkip: true,
        },
      },
    };

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      ...baseMock,
      game: gameWithSkip,
    });

    render(<ActionDock />);
    const skipBtn = screen.getByRole('button', { name: /SKIP/i });
    expect(skipBtn).not.toBeDisabled();
    fireEvent.click(skipBtn);
    expect(mockSkip).toHaveBeenCalled();
  });

  it('handles CALL BLUFF action when legal', () => {
    const gameWithBluff: GameViewEnvelope = {
      ...mockGame,
      game: {
        ...mockGame.game,
        legalActions: {
          ...mockGame.game.legalActions,
          canCallBluff: true,
        },
      },
    };

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      ...baseMock,
      game: gameWithBluff,
    });

    render(<ActionDock />);
    const callBluffBtn = screen.getByRole('button', { name: /CALL BLUFF/i });
    expect(callBluffBtn).not.toBeDisabled();
    fireEvent.click(callBluffBtn);
    expect(mockCallBluff).toHaveBeenCalled();
  });
});
