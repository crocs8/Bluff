import { useEffect, useRef, useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { PlayerChip, ConnectionBadge } from '../components/shared.js';
import { TableSeats } from '../components/TableSeats.js';
import { TableCenter } from '../components/TableCenter.js';
import { ActionDock } from '../components/ActionDock.js';

export function GameTable() {
  const { game, room, lastEvent, removePlayer, resetSession, connection } = useBluffSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [roundToast, setRoundToast] = useState<string | null>(null);
  const currentPlayerId = game?.game.currentPlayerId;
  const selfPlayerId = room?.selfPlayerId;
  const observedTurn = useRef(false);
  const previousCurrentPlayerId = useRef(currentPlayerId);

  // Turn vibration on mobile
  useEffect(() => {
    if (!observedTurn.current) {
      observedTurn.current = true;
      previousCurrentPlayerId.current = currentPlayerId;
      return;
    }
    if (
      currentPlayerId !== previousCurrentPlayerId.current &&
      currentPlayerId === selfPlayerId &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(200);
      } catch {}
    }
    previousCurrentPlayerId.current = currentPlayerId;
  }, [currentPlayerId, selfPlayerId]);

  // Round toast notification
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
  const isHost = room.hostPlayerId === room.selfPlayerId;
  const isMyTurn = state.currentPlayerId === room.selfPlayerId;

  return (
    <main className="felt-bg flex flex-col h-dvh w-full max-w-lg lg:max-w-4xl mx-auto overflow-hidden safe-top safe-left safe-right">
      {/* ── Top Bar ───────────────────────────────── */}
      <header className="flex items-center justify-between px-3 py-1.5 shrink-0 z-20">
        {/* Room ID Badge */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-[#a87e2b]/50 px-2.5 py-0.5 rounded-full">
          <span className="text-[10px] text-zinc-400 font-medium">Room</span>
          <span className="gold-text font-black text-xs tracking-wider">{room.roomId}</span>
        </div>

        {/* Connection & Deck Count Badge */}
        <div className="flex items-center gap-2">
          <ConnectionBadge status={connection} />
          <div className="flex items-center gap-1 bg-black/60 border border-[#a87e2b]/50 px-2 py-0.5 rounded-full text-[11px] font-semibold text-zinc-300">
            <span>🃏</span>
            <span>{room.numberOfDecks} Deck</span>
          </div>
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="size-7 rounded-full bg-black/60 border border-[#a87e2b]/50 grid place-items-center text-zinc-300 active:scale-95 text-xs font-bold"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ── Center Table Felt Area ────────────────── */}
      <div className="relative flex-1 mx-2 min-h-0 flex flex-col items-center justify-center">
        {/* The Oval Felt Table */}
        <div className="table-felt absolute inset-1 sm:inset-3 rounded-[48%] pointer-events-none" />

        {/* ── Opponent Player Seats Around Table ──── */}
        <TableSeats
          opponents={opponents}
          currentPlayerId={state.currentPlayerId}
          hostPlayerId={room.hostPlayerId}
        />

        {/* ── Central Claim Plaque, Cards & In-Table Reveal ── */}
        <TableCenter />

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
          <div className="absolute inset-x-6 top-4 z-40 fade-in">
            <div className="gold-panel rounded-2xl p-2.5 text-center border-2 border-[#f5c451] shadow-xl">
              <p className="gold-text font-black text-xs sm:text-sm">ROUND COMPLETE</p>
              <p className="text-zinc-200 text-xs mt-0.5">{roundToast}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Dock, Fanned Cards & Controls ── */}
      <ActionDock />

      {/* ── Menu / Drawer Dialog ───────────────────── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="modal-dialog w-full max-w-sm rounded-3xl p-5 select-none relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#a87e2b]/30 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👑</span>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">PLAYERS & MENU</h3>
                  <p className="text-[10px] text-zinc-400">Room: {room.roomId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="size-7 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white grid place-items-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Players List with Host Remove Controls */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Current Players ({state.players.length})
              </p>
              {state.players.map((p) => {
                const isTargetMe = p.id === room.selfPlayerId;
                const isTargetHost = p.id === room.hostPlayerId;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-[#1b4332] border border-[#d4a742]/50 grid place-items-center text-white font-bold text-[10px]">
                        {p.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-200 block">
                          {p.username} {isTargetMe ? '(You)' : ''}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {p.status === 'ELIMINATED' ? (p.rank ? `#${p.rank}` : 'Eliminated') : `${p.cardCount} Cards`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTargetHost && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-[9px] gold-text font-bold">
                          HOST
                        </span>
                      )}

                      {isHost && !isTargetMe && p.status !== 'ELIMINATED' && (
                        <button
                          type="button"
                          onClick={() => removePlayer(p.id)}
                          className="px-2 py-1 rounded bg-red-950/90 border border-red-700/70 text-red-300 text-[10px] font-bold hover:bg-red-900 active:scale-95 transition-all"
                        >
                          REMOVE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 text-xs shrink-0">
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">⚙ Settings</span>
                <span className="text-zinc-500 text-[10px]">Default</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-300">📖 How to Play</span>
                <span className="text-zinc-500 text-[10px]">Bluff Rules</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                resetSession();
              }}
              className="mt-3 w-full rounded-xl bg-red-900/60 border border-red-700/60 p-2.5 text-red-300 font-bold text-xs active:scale-95 shrink-0 uppercase tracking-wider"
            >
              Exit Game
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
