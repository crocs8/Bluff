import { useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { ConnectionBadge } from '../components/shared.js';

export function Lobby() {
  const { room, configure, start, error, connection } = useBluffSocket();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const isHost = room.hostPlayerId === room.selfPlayerId;
  const hostPlayer = room.players.find((p) => p.id === room.hostPlayerId);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="felt-bg mx-auto flex flex-col justify-between min-h-dvh max-w-md p-4 safe-top safe-bottom select-none">
      {/* ── Top Header ──────────────────────────────── */}
      <header className="flex items-center justify-between py-2 border-b border-[#a87e2b]/30 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold text-sm">ROOM -</span>
          <span className="gold-text font-black text-lg tracking-wider">{room.roomId}</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1 text-xs text-zinc-400 hover:text-white rounded active:scale-95"
            title="Copy Code"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
        <ConnectionBadge status={connection} />
      </header>

      {/* ── Main Lobby Card ─────────────────────────── */}
      <section className="gold-panel flex-1 rounded-3xl p-5 space-y-5 overflow-y-auto">
        {/* Host Box */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-[#a87e2b]/50">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[#c6952e] grid place-items-center font-black text-black text-base">
              {hostPlayer?.username[0]?.toUpperCase() ?? 'H'}
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                HOST
              </span>
              <span className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                {hostPlayer?.username} {hostPlayer?.id === room.selfPlayerId ? '(You)' : ''}
                <span className="text-sm">👑</span>
              </span>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              PLAYERS ({room.players.length} / 10)
            </span>
            {room.players.length < 2 && (
              <span className="text-[10px] text-amber-400 font-semibold">Min 2 players to start</span>
            )}
          </div>

          <div className="space-y-2">
            {room.players.map((player) => {
              const isMe = player.id === room.selfPlayerId;
              const isRoomHost = player.id === room.hostPlayerId;

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-[#2e7d32] grid place-items-center font-bold text-white text-xs">
                      {player.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-200">
                        {player.username} {isMe ? '(You)' : ''}
                      </p>
                      {isRoomHost && <span className="text-[10px] gold-text">Host</span>}
                    </div>
                  </div>

                  {/* Ready / Status Pill */}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                    READY
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deck Configuration Row */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-[#a87e2b]/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
              Number of Decks
            </span>
            <span className="font-extrabold text-sm gold-text">
              {room.numberOfDecks} Deck {room.numberOfDecks === 1 ? '(52 Cards)' : '(104 Cards)'}
            </span>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={() => configure(room.numberOfDecks === 1 ? 2 : 1)}
              className="px-3 py-1.5 rounded-xl border border-[#d4a742] bg-[#4a350b] text-[#f5c451] font-bold text-xs active:scale-95 uppercase tracking-wider"
            >
              CHANGE
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/90 border border-red-800 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}
      </section>

      {/* ── Start Game / Waiting Button ─────────────── */}
      <div className="pt-4">
        {isHost ? (
          <button
            type="button"
            onClick={start}
            disabled={room.players.length < 2}
            className="w-full btn-gold rounded-2xl py-4 text-base font-black tracking-wider uppercase disabled:opacity-40"
          >
            START GAME
          </button>
        ) : (
          <div className="w-full py-3.5 text-center text-zinc-400 text-xs font-semibold bg-black/50 rounded-2xl border border-zinc-800">
            Waiting for host to start the game…
          </div>
        )}
      </div>
    </main>
  );
}
