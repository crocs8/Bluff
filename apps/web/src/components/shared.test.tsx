import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CardView, PlayingPileView, PlayerChip, ConnectionBadge } from './shared.js';
import type { Card } from '@bluff/shared';

describe('CardView', () => {
  const mockCard: Card = {
    id: 'c1',
    rank: 'A',
    suit: 'spades',
    deckIndex: 0,
  };

  const heartCard: Card = {
    id: 'c2',
    rank: 'K',
    suit: 'hearts',
    deckIndex: 0,
  };

  it('renders card rank and suit symbol', () => {
    render(<CardView card={mockCard} />);
    expect(screen.getByRole('button', { name: /A of spades/i })).toBeInTheDocument();
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('♠').length).toBeGreaterThan(0);
  });

  it('applies red suit styling for hearts', () => {
    const { container } = render(<CardView card={heartCard} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('suit-red');
  });

  it('applies selected class when selected is true', () => {
    const { container } = render(<CardView card={mockCard} selected={true} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('selected');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<CardView card={mockCard} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('PlayingPileView', () => {
  it('renders count when cards are in pile', () => {
    render(<PlayingPileView count={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('PlayerChip', () => {
  it('renders player username, avatar initial, and card count', () => {
    render(<PlayerChip name="Alice" count={5} active={false} status="CONNECTED" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('5 Cards')).toBeInTheDocument();
  });

  it('indicates active turn with avatar-ring-turn class', () => {
    const { container } = render(<PlayerChip name="Bob" count={3} active={true} status="CONNECTED" />);
    const avatar = container.querySelector('.avatar-ring-turn');
    expect(avatar).toBeInTheDocument();
  });

  it('displays offline when player is disconnected', () => {
    render(<PlayerChip name="Charlie" count={2} active={false} status="DISCONNECTED" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays rank when player is eliminated/finished', () => {
    render(<PlayerChip name="Dave" count={0} active={false} status="ELIMINATED" rank={1} />);
    expect(screen.getAllByText(/#1/i).length).toBeGreaterThan(0);
  });
});

describe('ConnectionBadge', () => {
  it('renders Connected state', () => {
    render(<ConnectionBadge status="CONNECTED" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders Reconnecting state', () => {
    render(<ConnectionBadge status="RECONNECTING" />);
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('renders Connection Lost state', () => {
    render(<ConnectionBadge status="CONNECTION_LOST" />);
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });
});
