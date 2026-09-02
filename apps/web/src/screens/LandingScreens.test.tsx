import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Landing, CreateRoom, JoinRoom } from './LandingScreens.js';
import * as SocketProviderModule from '../socket-provider.js';

vi.mock('../socket-provider.js', () => ({
  useBluffSocket: vi.fn(),
}));

describe('Landing Screen', () => {
  it('renders BLUFF title, tagline, and action buttons', () => {
    const handleNavigate = vi.fn();
    render(<Landing onNavigate={handleNavigate} />);
    expect(screen.getByText('BLUFF')).toBeInTheDocument();
    expect(screen.getByText(/Who do you trust\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CREATE ROOM/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JOIN ROOM/i })).toBeInTheDocument();
  });

  it('navigates to create or join when clicking corresponding buttons', () => {
    const handleNavigate = vi.fn();
    render(<Landing onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /CREATE ROOM/i }));
    expect(handleNavigate).toHaveBeenCalledWith('create');

    fireEvent.click(screen.getByRole('button', { name: /JOIN ROOM/i }));
    expect(handleNavigate).toHaveBeenCalledWith('join');
  });
});

describe('CreateRoom Screen', () => {
  const mockCreate = vi.fn();
  const handleBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: undefined,
      game: undefined,
      challenge: undefined,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      chatMessages: {},
      create: mockCreate,
      join: vi.fn(),
      configure: vi.fn(),
      start: vi.fn(),
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: vi.fn(),
      resetSession: vi.fn(),
      sendQuickChat: vi.fn(),
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });
  });

  it('renders input for username and creates room upon submit', () => {
    render(<CreateRoom onBack={handleBack} />);
    const nameInput = screen.getByPlaceholderText(/Aryan's Room/i);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    const submitBtn = screen.getByRole('button', { name: /CREATE ROOM/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(mockCreate).toHaveBeenCalledWith('Alice');
  });

  it('disables submit button when username is empty', () => {
    render(<CreateRoom onBack={handleBack} />);
    const submitBtn = screen.getByRole('button', { name: /CREATE ROOM/i });
    expect(submitBtn).toBeDisabled();
  });

  it('handles back button click', () => {
    render(<CreateRoom onBack={handleBack} />);
    fireEvent.click(screen.getByRole('button', { name: /BACK/i }));
    expect(handleBack).toHaveBeenCalled();
  });
});

describe('JoinRoom Screen', () => {
  const mockJoin = vi.fn();
  const handleBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SocketProviderModule.useBluffSocket).mockReturnValue({
      connection: 'CONNECTED',
      room: undefined,
      game: undefined,
      challenge: undefined,
      lastEvent: undefined,
      error: undefined,
      removedNotice: undefined,
      submitting: false,
      chatMessages: {},
      create: vi.fn(),
      join: mockJoin,
      configure: vi.fn(),
      start: vi.fn(),
      play: vi.fn(),
      skip: vi.fn(),
      callBluff: vi.fn(),
      removePlayer: vi.fn(),
      resetSession: vi.fn(),
      sendQuickChat: vi.fn(),
      clearChallenge: vi.fn(),
      clearError: vi.fn(),
      clearRemovedNotice: vi.fn(),
    });
  });

  it('renders inputs for username and room code and joins room upon submit', () => {
    render(<JoinRoom onBack={handleBack} />);
    const nameInput = screen.getByPlaceholderText(/e\.g\. Karan/i);
    const codeInput = screen.getByPlaceholderText(/e\.g\. BLF59872/i);

    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.change(codeInput, { target: { value: 'BLF59872' } });

    const submitBtn = screen.getByRole('button', { name: /JOIN ROOM/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(mockJoin).toHaveBeenCalledWith('BLF59872', 'Bob');
  });

  it('disables submit button when inputs are incomplete', () => {
    render(<JoinRoom onBack={handleBack} />);
    const submitBtn = screen.getByRole('button', { name: /JOIN ROOM/i });
    expect(submitBtn).toBeDisabled();
  });
});
