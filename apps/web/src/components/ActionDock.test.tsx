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

  it('renders cards in hand, sort button, and action buttons', () => {
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue(baseMock);

    render(<ActionDock />);
    expect(screen.getAllByRole('button', { name: /K of/i }).length).toBe(2);
    expect(screen.getByRole('button', { name: /SORT/i })).toBeInTheDocument();
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

  it('sorts the local hand in rank order A -> 2 -> ... -> K upon clicking SORT', () => {
    const unsortedHandGame: GameViewEnvelope = {
      ...mockGame,
      game: {
        ...mockGame.game,
        hand: [
          { id: 'c1', rank: 'K', suit: 'spades', deckIndex: 0 },
          { id: 'c2', rank: '5', suit: 'hearts', deckIndex: 0 },
          { id: 'c3', rank: 'A', suit: 'diamonds', deckIndex: 0 },
          { id: 'c4', rank: '7', suit: 'clubs', deckIndex: 0 },
        ],
      },
    };

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      ...baseMock,
      game: unsortedHandGame,
    });

    render(<ActionDock />);

    // Default order should be K, 5, A, 7
    let cardButtons = screen.getAllByRole('button', { name: /of/i });
    expect(cardButtons[0]).toHaveAccessibleName('K of spades');
    expect(cardButtons[1]).toHaveAccessibleName('5 of hearts');
    expect(cardButtons[2]).toHaveAccessibleName('A of diamonds');
    expect(cardButtons[3]).toHaveAccessibleName('7 of clubs');

    // Click SORT button
    const sortBtn = screen.getByRole('button', { name: /SORT/i });
    fireEvent.click(sortBtn);

    // After SORT: A, 5, 7, K
    cardButtons = screen.getAllByRole('button', { name: /of/i });
    expect(cardButtons[0]).toHaveAccessibleName('A of diamonds');
    expect(cardButtons[1]).toHaveAccessibleName('5 of hearts');
    expect(cardButtons[2]).toHaveAccessibleName('7 of clubs');
    expect(cardButtons[3]).toHaveAccessibleName('K of spades');
  });

  it('preserves ID-based card selection across sorting and plays correct card IDs', () => {
    const mixedHandGame: GameViewEnvelope = {
      ...mockGame,
      game: {
        ...mockGame.game,
        roundLockedRank: 'A',
        hand: [
          { id: 'c1', rank: 'K', suit: 'spades', deckIndex: 0 },
          { id: 'c2', rank: 'A', suit: 'diamonds', deckIndex: 0 },
        ],
      },
    };

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      ...baseMock,
      game: mixedHandGame,
    });

    render(<ActionDock />);

    // Select 'A of diamonds' (second card in default order)
    const cardA = screen.getByRole('button', { name: 'A of diamonds' });
    fireEvent.click(cardA);

    // Click SORT (A will become first card)
    const sortBtn = screen.getByRole('button', { name: /SORT/i });
    fireEvent.click(sortBtn);

    // Click PLAY
    const playBtn = screen.getByRole('button', { name: /PLAY/i });
    fireEvent.click(playBtn);

    // Expect 'c2' (card A's ID) to have been sent
    expect(mockPlay).toHaveBeenCalledWith(['c2'], 'A');
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
