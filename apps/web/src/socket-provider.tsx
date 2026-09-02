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

import { QUICK_CHAT_MESSAGES, type QuickChatMessageId, type Rank } from '@bluff/shared';

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
  removedNotice: string | undefined;
  submitting: boolean;
  chatMessages: Record<string, string | undefined>;
  // Actions
  create(username: string): void;
  join(roomId: string, username: string): void;
  configure(decks: 1 | 2): void;
  start(): void;
  play(cardIds: string[], claimedRank: Rank): void;
  skip(): void;
  callBluff(): void;
  removePlayer(playerId: string): void;
  resetSession(): void;
  sendQuickChat(messageId: QuickChatMessageId): void;
  clearChallenge(): void;
  clearError(): void;
  clearRemovedNotice(): void;
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
  const [removedNotice, setRemovedNotice] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<Record<string, string | undefined>>({});
  const chatTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
          if (ack.ok) {
            setConnection('RECONNECTED');
            setTimeout(() => setConnection('CONNECTED'), 2500);
          } else {
            // If resume failed (e.g. removed or game ended), clear stale session
            localStorage.removeItem(SESSION_KEY);
            setRoom(undefined);
            setGame(undefined);
            setConnection('CONNECTED');
          }
        });
      } else {
        setConnection('CONNECTED');
      }
      didConnect.current = true;
    }

    function handleDisconnect() {
      setConnection('CONNECTION_LOST');
    }

    function handleRemoved(payload: { reason: string }) {
      localStorage.removeItem(SESSION_KEY);
      setRoom(undefined);
      setGame(undefined);
      setChallenge(undefined);
      setRemovedNotice(payload.reason === 'PLAYER_REMOVED_BY_HOST' ? 'You were removed by the host.' : 'You have been removed from the room.');
    }

    function handleQuickChatMessage(payload: { playerId: string; messageId: QuickChatMessageId }) {
      const text = QUICK_CHAT_MESSAGES[payload.messageId];
      if (!text) return;

      setChatMessages((prev) => ({ ...prev, [payload.playerId]: text }));

      const existing = chatTimers.current.get(payload.playerId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        setChatMessages((prev) => {
          if (prev[payload.playerId] === text) {
            const next = { ...prev };
            delete next[payload.playerId];
            return next;
          }
          return prev;
        });
        chatTimers.current.delete(payload.playerId);
      }, 2700);

      chatTimers.current.set(payload.playerId, timer);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:view', setRoom);
    socket.on('room:removed', handleRemoved);
    socket.on('game:view', setGame);
    socket.on('game:event', setLastEvent);
    socket.on('game:challenge-result', setChallenge);
    socket.on('quick-chat:message', handleQuickChatMessage);
    socket.on('action:error', (e: { message: string }) => {
      setError(e.message);
      setSubmitting(false);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:view', setRoom);
      socket.off('room:removed', handleRemoved);
      socket.off('game:view', setGame);
      socket.off('game:event', setLastEvent);
      socket.off('game:challenge-result', setChallenge);
      socket.off('quick-chat:message', handleQuickChatMessage);
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

  const resetSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setRoom(undefined);
    setGame(undefined);
    setChallenge(undefined);
    setError(undefined);
    setRemovedNotice(undefined);
    socket.emit('room:leave', {}, () => {});
  }, [socket]);

  const sendQuickChat = useCallback(
    (messageId: QuickChatMessageId) => {
      socket.emit('quick-chat:send', { messageId }, () => {});
    },
    [socket],
  );

  const value: SocketState = useMemo(
    () => ({
      connection,
      room,
      game,
      challenge,
      lastEvent,
      error,
      removedNotice,
      submitting,
      chatMessages,
      create: (username) => send('room:create', { username }),
      join: (roomId, username) => send('room:join', { roomId, username }),
      configure: (numberOfDecks) => send('room:configure', { numberOfDecks }),
      start: () => send('room:start', {}),
      play: (cardIds, claimedRank) => send('game:play', { cardIds, claimedRank }),
      skip: () => send('game:skip', {}),
      callBluff: () => send('game:call-bluff', {}),
      removePlayer: (playerId) => send('room:remove-player', { playerId }),
      resetSession,
      sendQuickChat,
      clearChallenge: () => setChallenge(undefined),
      clearError: () => setError(undefined),
      clearRemovedNotice: () => setRemovedNotice(undefined),
    }),
    [connection, room, game, challenge, lastEvent, error, removedNotice, submitting, chatMessages, send, resetSession, sendQuickChat],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBluffSocket(): SocketState {
  const state = useContext(Context);
  if (!state) throw new Error('useBluffSocket must be used within a SocketProvider');
  return state;
}
