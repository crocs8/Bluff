import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import type { Rank } from '@bluff/shared';

import type { ChallengeResult, GameViewEnvelope, PublicGameEvent, RoomView } from './types.js';

// ── Connection status ─────────────────────────────
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'CONNECTION_LOST' | 'RECONNECTING' | 'RECONNECTED';

// ── Context shape ─────────────────────────────────
export interface SocketState {
  connection: ConnectionStatus;
  room: RoomView | undefined;
  game: GameViewEnvelope | undefined;
  challenge: ChallengeResult | undefined;
  lastEvent: PublicGameEvent | undefined;
  error: string | undefined;
  submitting: boolean;
  // Actions
  create(username: string): void;
  join(roomId: string, username: string): void;
  configure(decks: 1 | 2): void;
  start(): void;
  play(cardIds: string[], claimedRank: Rank): void;
  skip(): void;
  callBluff(): void;
  clearChallenge(): void;
  clearError(): void;
}

const Context = createContext<SocketState | undefined>(undefined);
const SESSION_KEY = 'bluff.player-id';

// ── Provider ──────────────────────────────────────
export function SocketProvider({ children }: PropsWithChildren) {
  const [connection, setConnection] = useState<ConnectionStatus>('CONNECTING');
  const [room, setRoom] = useState<RoomView | undefined>(undefined);
  const [game, setGame] = useState<GameViewEnvelope | undefined>(undefined);
  const [challenge, setChallenge] = useState<ChallengeResult | undefined>(undefined);
  const [lastEvent, setLastEvent] = useState<PublicGameEvent | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Keep track of whether the socket has had its first successful connect
  const didConnect = useRef(false);

  const socket: Socket = useMemo(
    () =>
      io(import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:3001', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }),
    [],
  );

  useEffect(() => {
    function handleConnect() {
      const playerId = localStorage.getItem(SESSION_KEY);
      if (playerId && didConnect.current) {
        // Reconnect — resume existing session
        setConnection('RECONNECTING');
        socket.emit('session:resume', { playerId }, (ack: { ok: boolean; message?: string }) => {
          setConnection(ack.ok ? 'RECONNECTED' : 'CONNECTED');
          setTimeout(() => setConnection('CONNECTED'), 2500);
        });
      } else {
        setConnection('CONNECTED');
      }
      didConnect.current = true;
    }

    function handleDisconnect() {
      setConnection('CONNECTION_LOST');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:view', setRoom);
    socket.on('game:view', setGame);
    socket.on('game:event', setLastEvent);
    socket.on('game:challenge-result', setChallenge);
    socket.on('action:error', (e: { message: string }) => {
      setError(e.message);
      setSubmitting(false);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:view', setRoom);
      socket.off('game:view', setGame);
      socket.off('game:event', setLastEvent);
      socket.off('game:challenge-result', setChallenge);
      socket.off('action:error');
      socket.disconnect();
    };
  }, [socket]);

  // Generic acknowledgement handler
  const receiveAck = useCallback((ack: { ok: boolean; playerId?: string; message?: string }) => {
    setSubmitting(false);
    if (!ack.ok) {
      setError(ack.message ?? 'Action failed.');
      return;
    }
    if (ack.playerId) {
      localStorage.setItem(SESSION_KEY, ack.playerId);
    }
  }, []);

  // Generic emit helper
  const send = useCallback(
    (eventName: string, payload: object) => {
      setSubmitting(true);
      setError(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit(eventName, payload, receiveAck);
    },
    [socket, receiveAck],
  );

  const value: SocketState = useMemo(
    () => ({
      connection,
      room,
      game,
      challenge,
      lastEvent,
      error,
      submitting,
      create: (username) => send('room:create', { username }),
      join: (roomId, username) => send('room:join', { roomId, username }),
      configure: (numberOfDecks) => send('room:configure', { numberOfDecks }),
      start: () => send('room:start', {}),
      play: (cardIds, claimedRank) => send('game:play', { cardIds, claimedRank }),
      skip: () => send('game:skip', {}),
      callBluff: () => send('game:call-bluff', {}),
      clearChallenge: () => setChallenge(undefined),
      clearError: () => setError(undefined),
    }),
    [connection, room, game, challenge, lastEvent, error, submitting, send],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBluffSocket(): SocketState {
  const state = useContext(Context);
  if (!state) throw new Error('useBluffSocket must be used within a SocketProvider');
  return state;
}
