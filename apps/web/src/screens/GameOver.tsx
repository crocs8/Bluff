import { useBluffSocket } from '../socket-provider.js';

export function GameOver() {
  const { game, room, resetSession } = useBluffSocket();

  if (!game || !room) return null;

  const state = game.game;
  const winnerId = state.rankings[0];
  const winner = state.players.find((p) => p.id === winnerId);
  const isWinnerMe = winnerId === room.selfPlayerId;

  // Identify last place (final loser)
  const lastPlayerId = state.rankings[state.rankings.length - 1];
  const lastPlayer = state.players.find((p) => p.id === lastPlayerId);

  return (
    <main className="felt-bg min-h-dvh flex flex-col justify-between p-4 sm:p-6 max-w-md sm:max-w-lg mx-auto safe-top safe-bottom safe-left safe-right select-none">
      {/* ── Top Trophy & Winner Header ──────────────── */}
      <header className="text-center pt-2 sm:pt-4">
        <div className="text-4xl sm:text-5xl animate-bounce mb-2">🏆</div>
        <h1 className="text-2xl sm:text-3xl font-black gold-gradient-text tracking-wider uppercase">
          {isWinnerMe ? 'YOU WIN!' : `${winner?.username ?? 'PLAYER'} WINS!`}
        </h1>
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mt-1">
          GAME OVER
        </p>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
          Final Rankings
        </p>
      </header>

      {/* ── Rankings List Card ──────────────────────── */}
      <section className="gold-panel rounded-3xl p-4 sm:p-5 my-3 flex-1 overflow-y-auto no-scrollbar space-y-2">
        {state.rankings.map((pid, idx) => {
          const p = state.players.find((player) => player.id === pid);
          if (!p) return null;
          const isMe = p.id === room.selfPlayerId;
          const isWinner = idx === 0;
          const isLoser = idx === state.rankings.length - 1 && state.rankings.length > 1;

          return (
            <div
              key={p.id}
              className={[
                'flex items-center justify-between p-3 rounded-2xl border transition-all',
                isWinner
                  ? 'bg-amber-950/70 border-[#f5c451] shadow-[0_0_15px_rgba(245,196,81,0.25)]'
                  : isLoser
                    ? 'bg-red-950/40 border-red-800/60'
                    : 'bg-black/40 border-zinc-800',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`size-8 rounded-full grid place-items-center font-black text-xs ${
                    isWinner
                      ? 'bg-[#c6952e] text-black shadow-md'
                      : idx === 1
                        ? 'bg-zinc-400 text-black'
                        : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {isWinner ? '👑' : `${idx + 1}`}
                </div>

                {/* Player Avatar & Name */}
                <div>
                  <p className="font-bold text-xs sm:text-sm text-zinc-100">
                    {p.username} {isMe ? '(You)' : ''}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {isWinner
                      ? '1st Place · Winner'
                      : isLoser
                        ? 'Last Place'
                        : `${idx + 1}${idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`}
                  </p>
                </div>
              </div>

              {/* Status or Skull for Loser */}
              <div className="text-right">
                {isLoser ? (
                  <div className="flex items-center gap-1 text-red-400 font-bold text-xs">
                    <span className="text-base">💀</span>
                    <span>LAST</span>
                  </div>
                ) : isWinner ? (
                  <span className="gold-text font-black text-xs sm:text-sm">WINNER</span>
                ) : (
                  <span className="text-zinc-400 font-semibold text-xs">Rank #{idx + 1}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Final Loser Callout if applicable */}
        {lastPlayer && state.rankings.length > 1 && (
          <div className="p-3 rounded-2xl bg-red-950/30 border border-red-900/50 flex items-center justify-center gap-2 mt-2">
            <span className="text-2xl">💀</span>
            <div className="text-left">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                LAST PLACE
              </span>
              <span className="text-xs font-bold text-zinc-300">{lastPlayer.username}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Bottom Action Buttons ───────────────────── */}
      <footer className="space-y-2 pt-2 shrink-0">
        <button
          type="button"
          onClick={resetSession}
          className="w-full btn-play rounded-2xl py-3.5 sm:py-4 font-black text-sm sm:text-base tracking-wider uppercase shadow-lg active:scale-95 transition-all"
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={resetSession}
          className="w-full rounded-2xl bg-black/60 border border-zinc-700 py-3 text-zinc-300 font-bold text-xs sm:text-sm active:scale-95 transition-all hover:text-white uppercase tracking-wider"
        >
          BACK TO LOBBY
        </button>
      </footer>
    </main>
  );
}
