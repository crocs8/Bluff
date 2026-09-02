import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameOver } from './GameOver.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { GameViewEnvelope, RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('GameOver Screen', () => {
  const mockRoom: RoomView = {
    roomId: 'ROOM1',
    hostPlayerId: 'p1',
    numberOfDecks: 1,
    gameStarted: true,
    revision: 10,
    selfPlayerId: 'p1',
    players: [
      { id: 'p1', username: 'Alice', connectionStatus: 'CONNECTED' },
      { id: 'p2', username: 'Bob', connectionStatus: 'CONNECTED' },
      { id: 'p3', username: 'Charlie', connectionStatus: 'CONNECTED' },
    ],
  };

  const mockGame: GameViewEnvelope = {
    revision: 10,
    game: {
      roomId: 'ROOM1',
      phase: 'GAME_END',
      roundNumber: 5,
      seatingOrder: ['p1', 'p2', 'p3'],
      players: [
        { id: 'p1', username: 'Alice', status: 'ELIMINATED', cardCount: 0, rank: 1 },
        { id: 'p2', username: 'Bob', status: 'ELIMINATED', cardCount: 0, rank: 2 },
        { id: 'p3', username: 'Charlie', status: 'ELIMINATED', cardCount: 8, rank: 3 },
      ],
      hand: [],
      playingPileCount: 0,
      rankings: ['p1', 'p2', 'p3'],
      legalActions: {
        canPlay: false,
        canSkip: false,
        canCallBluff: false,
        maxPlayCards: 4,
      },
    },
  };

  it('renders final rankings, winner and final loser, and calls resetSession on Play Again', () => {
    const mockResetSession = vi.fn();

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
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
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: vi.fn(),
      resetSession: mockResetSession,
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<GameOver />);
    expect(screen.getByText('GAME OVER')).toBeInTheDocument();
    expect(screen.getByText('Final Rankings')).toBeInTheDocument();

    // Check winner
    expect(screen.getByText(/1st Place/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();

    // Check second place
    expect(screen.getByText(/2nd Place/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();

    // Check final loser
    expect(screen.getAllByText(/LAST PLACE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Charlie/i).length).toBeGreaterThan(0);

    // Click Play Again
    const playAgainBtn = screen.getByRole('button', { name: /PLAY AGAIN/i });
    fireEvent.click(playAgainBtn);
    expect(mockResetSession).toHaveBeenCalled();
  });
});
