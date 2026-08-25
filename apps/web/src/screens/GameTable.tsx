import { useEffect, useRef, useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { PlayerChip, PlayingPileView } from '../components/shared.js';
import { ActionDock } from '../components/ActionDock.js';
import { ChallengeOverlay } from '../components/ChallengeOverlay.js';
import type { Rank } from '@bluff/shared';

// ── Number word converter for claim display ────────
function formatClaimText(count: number, rank: Rank): string {
  const numberWords: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
    7: 'SEVEN',
    8: 'EIGHT',
  };

  const rankPlural: Record<Rank, string> = {
    A: 'ACES',
    '2': 'TWOS',
    '3': 'THREES',
    '4': 'FOURS',
    '5': 'FIVES',
    '6': 'SIXES',
    '7': 'SEVENS',
    '8': 'EIGHTS',
    '9': 'NINES',
    '10': 'TENS',
    J: 'JACKS',
    Q: 'QUEENS',
    K: 'KINGS',
  };

  const countWord = numberWords[count] ?? `${count}`;
  const rankWord = count === 1 ? (rank === 'A' ? 'ACE' : rank === 'K' ? 'KING' : rank === 'Q' ? 'QUEEN' : rank === 'J' ? 'JACK' : rank) : (rankPlural[rank] ?? `${rank}S`);
  return `${countWord} ${rankWord}`;
}

export function GameTable() {
  const { game, room, lastEvent, removePlayer } = useBluffSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [roundToast, setRoundToast] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const currentPlayerId = game?.game.currentPlayerId;
  const selfPlayerId = room?.selfPlayerId;
  const observedTurn = useRef(false);
  const previousCurrentPlayerId = useRef(currentPlayerId);

  useEffect(() => {
    if (!observedTurn.current) {
      observedTurn.current = true;
      previousCurrentPlayerId.current = currentPlayerId;
      return;
    }
    if (currentPlayerId !== previousCurrentPlayerId.current && currentPlayerId === selfPlayerId && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(200);
    }
    previousCurrentPlayerId.current = currentPlayerId;
  }, [currentPlayerId, selfPlayerId]);

  useEffect(() => {
    const deadline = game?.turnDeadlineAt;
    if (deadline === undefined) {
      setSecondsLeft(0);
      return;
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [game?.turnDeadlineAt]);

  useEffect(() => {
    if (!lastEvent || !game) return;
    if (lastEvent.type === 'RoundEnded') {
      const starterId = 'starterId' in lastEvent ? lastEvent.starterId : undefined;
      const starter = starterId
        ? game.game.players.find((p) => p.id === starterId)?.username ?? 'Next player'
        : 'Next round';
      setRoundToast(`${starter} starts the next round`);
      const timer = setTimeout(() => setRoundToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent, game]);

  if (!game || !room) return null;

  const state = game.game;
  const me = state.players.find((p) => p.id === room.selfPlayerId);
  const opponents = state.players.filter((p) => p.id !== room.selfPlayerId);

  const isMyTurn = state.currentPlayerId === room.selfPlayerId;
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const lastPlayer = state.lastClaim ? state.players.find((p) => p.id === state.lastClaim!.playerId) : null;

  return (
    <main className="felt-bg flex flex-col h-dvh max-w-md mx-auto overflow-hidden safe-top">
      {/* ── Top Bar ───────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-2 shrink-0 z-10">
        {/* Room ID Badge */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-[#a87e2b]/50 px-2.5 py-1 rounded-full">
          <span className="text-[10px] text-zinc-400 font-medium">Room ID</span>
          <span className="gold-text font-black text-xs tracking-wider">{room.roomId}</span>
        </div>

        {/* Crown Icon */}
        <span className="text-base" title="Bluff High Stakes">
          👑
        </span>

        {/* Deck Count & Menu Hamburger */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-black/60 border border-[#a87e2b]/50 px-2 py-1 rounded-full text-xs font-semibold text-zinc-300">
            <span>🃏</span>
            <span>{room.numberOfDecks} Deck</span>
          </div>
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="size-8 rounded-full bg-black/60 border border-[#a87e2b]/50 grid place-items-center text-zinc-300 active:scale-95 text-xs font-bold"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ── Center Table Felt Area ────────────────── */}
      <div className="relative flex-1 mx-2 min-h-0">
        {/* The Oval Felt Table */}
        <div className="table-felt absolute inset-1.5 rounded-[48%]" />

        {/* ── Opponent Player Seats positioned around the table ── */}
        <div className="absolute inset-0 pointer-events-none">
          {opponents.map((player, idx) => {
            const pos = getOpponentPosition(opponents.length, idx);
            return (
              <div
                key={player.id}
                className="absolute pointer-events-auto transition-all duration-300"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <PlayerChip
                  name={player.username}
                  count={player.cardCount}
                  status={player.status}
                  rank={player.rank}
                  active={state.currentPlayerId === player.id}
                  isHost={player.id === room.hostPlayerId}
                />
              </div>
            );
          })}
        </div>

        {/* ── Central Claim Plaque & Pile ─────────── */}
        <div className="absolute inset-x-8 top-[58%] -translate-y-1/2 text-center pointer-events-none z-10 flex flex-col items-center">
          {/* Claim Plaque */}
          <div className="claim-plaque rounded-2xl px-5 py-2.5 max-w-56 w-full mb-1">
            <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
              LAST PLAY BY
            </p>
            <p className="font-bold text-xs text-zinc-200 mt-0.5">
              {lastPlayer?.username ?? '—'}
            </p>

            <p className="gold-text text-[10px] uppercase font-extrabold tracking-widest mt-1.5">
              CLAIMED
            </p>
            <p className="gold-gradient-text font-black text-sm tracking-wide mt-0.5">
              {state.lastClaim ? formatClaimText(state.lastClaim.cardCount, state.lastClaim.claimedRank) : 'START THE ROUND'}
            </p>
          </div>

          {/* Playing Pile */}
          <div className="flex flex-col items-center mt-1">
            <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">
              PLAYING PILE
            </span>
            <PlayingPileView count={state.playingPileCount} />
          </div>

          {/* Turn Alert Banner */}
          {isMyTurn ? (
            <div className="mt-1 flex flex-col items-center animate-bounce">
              <span className={[
                'border font-black text-xs px-3 py-0.5 rounded-full tracking-wider',
                secondsLeft <= 10
                  ? 'bg-red-500/20 text-red-300 border-red-400/70 shadow-[0_0_12px_#f8717180] animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_#34d39980]',
              ].join(' ')}>
                YOUR TURN {secondsLeft > 0 ? `· ${secondsLeft}s` : '· 0s'}
              </span>
              <span className="text-emerald-400 text-xs font-bold leading-none -mt-0.5">▼</span>
            </div>
          ) : (
            <div className="mt-1">
              <span className="bg-red-950/60 text-red-300 border border-red-800/60 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                {currentPlayer ? `${currentPlayer.username}'s Turn · ${secondsLeft}s` : "Opponent's Turn"}
              </span>
            </div>
          )}
        </div>

        {/* ── Current Player Avatar Seat (Bottom Center) ── */}
        {me && (
          <div className="absolute bottom-1 inset-x-0 flex justify-center z-10">
            <PlayerChip
              name="You"
              count={me.cardCount}
              status={me.status}
              rank={me.rank}
              active={isMyTurn}
              isHost={me.id === room.hostPlayerId}
              isMe
              showCardsBack={false}
            />
          </div>
        )}

        {/* ── Round End Toast ──────────────────────── */}
        {roundToast && (
          <div className="absolute inset-x-6 top-6 z-40 fade-in">
            <div className="gold-panel rounded-2xl p-3 text-center border-2 border-[#f5c451]">
              <p className="gold-text font-black text-sm">ROUND COMPLETE</p>
              <p className="text-zinc-200 text-xs mt-0.5">{roundToast}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Dock & Cards ────────────────────── */}
      <ActionDock />

      {/* ── Challenge Overlay ──────────────────────── */}
      <ChallengeOverlay />

      {/* ── Menu / Drawer Dialog ───────────────────── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="modal-dialog w-full max-w-sm rounded-3xl p-6 select-none relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#a87e2b]/30 mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#c6952e] grid place-items-center font-bold text-black text-base">
                  {me?.username[0]?.toUpperCase() ?? 'Y'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">{me?.username ?? 'You'}</h3>
                  <p className="text-[11px] text-zinc-400">Room: {room.roomId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="size-8 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white grid place-items-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {room.selfPlayerId === room.hostPlayerId && state.players.filter((player) => player.id !== room.selfPlayerId && player.status !== 'ELIMINATED').map((player) => (
                <button key={player.id} type="button" onClick={() => removePlayer(player.id)} className="w-full p-3 rounded-xl bg-red-950/40 border border-red-800/70 flex items-center justify-between text-red-300">
                  <span>Remove {player.username}</span><span className="text-[10px] uppercase">Host</span>
                </button>
              ))}
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">⚙ Settings</span>
                <span className="text-zinc-500 text-xs">Default</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">📖 How to Play</span>
                <span className="text-zinc-500 text-xs">Bluff Rules</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">💬 Sound Effects</span>
                <span className="text-emerald-400 text-xs">ON</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                window.location.reload();
              }}
              className="mt-6 w-full rounded-xl bg-red-900/60 border border-red-700/60 p-3 text-red-300 font-bold text-sm active:scale-95"
            >
              Exit Game
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Position Opponents around the table perimeter ─
function getOpponentPosition(total: number, index: number): { x: number; y: number } {
  const slots: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 16 }],
    2: [{ x: 18, y: 32 }, { x: 82, y: 32 }],
    3: [{ x: 16, y: 27 }, { x: 50, y: 13 }, { x: 84, y: 27 }],
    4: [{ x: 13, y: 32 }, { x: 34, y: 13 }, { x: 66, y: 13 }, { x: 87, y: 32 }],
    5: [{ x: 11, y: 36 }, { x: 28, y: 15 }, { x: 50, y: 10 }, { x: 72, y: 15 }, { x: 89, y: 36 }],
    6: [{ x: 10, y: 32 }, { x: 23, y: 14 }, { x: 41, y: 9 }, { x: 59, y: 9 }, { x: 77, y: 14 }, { x: 90, y: 32 }],
    7: [{ x: 9, y: 33 }, { x: 19, y: 16 }, { x: 33, y: 10 }, { x: 50, y: 8 }, { x: 67, y: 10 }, { x: 81, y: 16 }, { x: 91, y: 33 }],
    8: [{ x: 8, y: 34 }, { x: 17, y: 18 }, { x: 29, y: 11 }, { x: 43, y: 8 }, { x: 57, y: 8 }, { x: 71, y: 11 }, { x: 83, y: 18 }, { x: 92, y: 34 }],
    9: [{ x: 7, y: 34 }, { x: 15, y: 20 }, { x: 26, y: 12 }, { x: 38, y: 8 }, { x: 50, y: 7 }, { x: 62, y: 8 }, { x: 74, y: 12 }, { x: 85, y: 20 }, { x: 93, y: 34 }],
  };
  return slots[total]?.[index] ?? { x: 50, y: 12 };
}
