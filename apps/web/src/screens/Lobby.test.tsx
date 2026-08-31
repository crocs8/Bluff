import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lobby } from './Lobby.js';
import * as SocketProviderModule from '../socket-provider.js';
import type { RoomView } from '../types.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('Lobby Screen', () => {
  const mockConfigure = vi.fn();
  const mockStart = vi.fn();
  const mockRemovePlayer = vi.fn();

  const mockRoom: RoomView = {
    roomId: 'ROOM42',
    hostPlayerId: 'p1',
    numberOfDecks: 1,
    gameStarted: false,
    revision: 1,
    selfPlayerId: 'p1',
    players: [
      { id: 'p1', username: 'Alice', connectionStatus: 'CONNECTED' },
      { id: 'p2', username: 'Bob', connectionStatus: 'CONNECTED' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders room code, player list with host badge, and host start button', () => {
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: mockRoom,
      game: undefined,
      challenge: undefined,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      create: vi.fn(),
      join: vi.fn(),
      configure: mockConfigure,
      start: mockStart,
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: mockRemovePlayer,
      resetSession: vi.fn(),
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<Lobby />);
    expect(screen.getAllByText('ROOM42').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alice/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /START GAME/i })).toBeInTheDocument();
    // Host sees REMOVE button for Bob
    expect(screen.getByRole('button', { name: /REMOVE/i })).toBeInTheDocument();
  });

  it('allows host to change deck configuration with CHANGE button and remove player', () => {
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: mockRoom,
      game: undefined,
      challenge: undefined,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      create: vi.fn(),
      join: vi.fn(),
      configure: mockConfigure,
      start: mockStart,
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: mockRemovePlayer,
      resetSession: vi.fn(),
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<Lobby />);
    const changeBtn = screen.getByRole('button', { name: /CHANGE/i });
    fireEvent.click(changeBtn);
    expect(mockConfigure).toHaveBeenCalledWith(2);

    const removeBtn = screen.getByRole('button', { name: /REMOVE/i });
    fireEvent.click(removeBtn);
    expect(mockRemovePlayer).toHaveBeenCalledWith('p2');
  });

  it('disables deck configuration and start/remove button for non-host players', () => {
    const nonHostRoom: RoomView = {
      ...mockRoom,
      selfPlayerId: 'p2',
    };

    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: nonHostRoom,
      game: undefined,
      challenge: undefined,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      create: vi.fn(),
      join: vi.fn(),
      configure: mockConfigure,
      start: mockStart,
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: mockRemovePlayer,
      resetSession: vi.fn(),
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });

    render(<Lobby />);
    expect(screen.queryByRole('button', { name: /START GAME/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /REMOVE/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for host to start the game/i)).toBeInTheDocument();
  });
});
