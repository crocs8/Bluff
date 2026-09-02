import { useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { ConnectionBadge } from '../components/shared.js';

export function Lobby() {
  const { room, configure, start, removePlayer, resetSession, error, connection } = useBluffSocket();
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
    <main className="felt-bg mx-auto flex flex-col justify-between min-h-dvh w-full max-w-md sm:max-w-lg lg:max-w-xl p-3 sm:p-5 safe-top safe-bottom safe-left safe-right select-none">
      {/* ── Top Header ──────────────────────────────── */}
      <header className="flex items-center justify-between py-2 border-b border-[#a87e2b]/30 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetSession}
            className="p-1 text-zinc-400 hover:text-white rounded active:scale-95 text-sm font-bold"
            title="Leave Lobby"
          >
            ← LEAVE
          </button>
          <span className="gold-text font-black text-lg tracking-wider ml-1">LOBBY</span>
        </div>

        {/* Room Code Pill with 1-Tap Copy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/60 border border-[#a87e2b]/60 px-3 py-1 rounded-full">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">Room Code</span>
            <span className="gold-text font-black text-sm tracking-wider">{room.roomId}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-0.5 text-xs text-zinc-300 hover:text-white rounded active:scale-95 ml-0.5"
              title="Copy Room Code"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <ConnectionBadge status={connection} />
        </div>
      </header>

      {/* ── Main Content: Players & Game Settings ──── */}
      <section className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto no-scrollbar pb-3">
        {/* Players Card */}
        <div className="gold-panel rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] sm:text-xs text-zinc-300 font-bold uppercase tracking-wider">
              PLAYERS ({room.players.length} / 10)
            </span>
            {room.players.length < 2 ? (
              <span className="text-[10px] text-amber-400 font-semibold">Min 2 players to start</span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold">Ready to play</span>
            )}
          </div>

          <div className="space-y-2">
            {room.players.map((player) => {
              const isMe = player.id === room.selfPlayerId;
              const isRoomHost = player.id === room.hostPlayerId;

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-black/40 border border-zinc-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 sm:size-9 rounded-full bg-[#1b4332] border border-[#d4a742]/60 grid place-items-center font-bold text-white text-xs">
                      {player.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                        {player.username} {isMe ? '(You)' : ''}
                        {isRoomHost && <span className="text-xs" title="Host">👑</span>}
                      </p>
                      {isRoomHost && <span className="text-[9px] gold-text font-bold">Host</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Host Remove Player Button */}
                    {isHost && !isMe && (
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-700/60 text-red-300 font-bold text-[10px] hover:bg-red-900/80 active:scale-95 transition-all uppercase tracking-wider"
                        title="Remove player"
                      >
                        REMOVE
                      </button>
                    )}

                    {/* Ready Badge with Signal icon */}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                      <span>Ready</span>
                      <span className="text-[9px]">📶</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Waiting for players placeholders if under 4 players */}
            {room.players.length < 4 &&
              Array.from({ length: 4 - room.players.length }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center p-2.5 rounded-xl border border-dashed border-zinc-800 text-zinc-600 text-xs font-medium"
                >
                  <span className="size-8 rounded-full border border-dashed border-zinc-800 grid place-items-center mr-2.5 text-zinc-700 text-xs">
                    +
                  </span>
                  <span>Waiting for player…</span>
                </div>
              ))}
          </div>
        </div>

        {/* Game Settings Card */}
        <div className="gold-panel rounded-2xl p-4 space-y-2.5 text-xs">
          <p className="text-[11px] sm:text-xs text-zinc-300 font-bold uppercase tracking-wider px-1">
            GAME SETTINGS
          </p>

          <div className="space-y-1.5">
            {/* Number of Decks Toggle */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-zinc-300 font-medium block">Decks</span>
                <span className="text-[10px] text-zinc-500">
                  {room.numberOfDecks === 1 ? '52 Cards (2-5 Players)' : '104 Cards (6-10 Players)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="gold-text font-black text-sm">{room.numberOfDecks}</span>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => configure(room.numberOfDecks === 1 ? 2 : 1)}
                    className="px-2.5 py-1 rounded-lg border border-[#d4a742] bg-[#4a350b] text-[#f5c451] font-bold text-[10px] active:scale-95 uppercase tracking-wider"
                  >
                    CHANGE
                  </button>
                )}
              </div>
            </div>

            {/* Static Settings Details */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-300 font-medium">Turn Timer</span>
              <span className="text-zinc-300 font-bold">30s</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-300 font-medium">Locked Rank</span>
              <span className="text-emerald-400 font-bold">ON</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/90 border border-red-800 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}
      </section>

      {/* ── Start Game / Waiting Button ─────────────── */}
      <div className="pt-2 shrink-0">
        {isHost ? (
          <button
            type="button"
            onClick={start}
            disabled={room.players.length < 2}
            className="w-full btn-play rounded-2xl py-3.5 sm:py-4 text-sm sm:text-base font-black tracking-wider uppercase disabled:opacity-40 shadow-lg"
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
