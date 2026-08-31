import { useBluffSocket } from '../socket-provider.js';

function getOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function GameOver() {
  const { game, room, resetSession } = useBluffSocket();
  if (!game || !room) return null;

  const { players, rankings } = game.game;

  // Build ordered list: ranked players in order
  const orderedPlayers = rankings.map((id, index) => {
    const player = players.find((p) => p.id === id);
    const rank = index + 1;
    const isLoser = rankings.length > 1 && index === rankings.length - 1;
    return { id, username: player?.username ?? id, rank, isLoser };
  });

  const loser = orderedPlayers.find((p) => p.isLoser);

  const getRankBadge = (rank: number, isLoser: boolean) => {
    if (isLoser) return '💀';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <main className="felt-bg mx-auto flex flex-col justify-between min-h-dvh max-w-md p-5 safe-top safe-bottom select-none">
      {/* ── Title ─────────────────────────────────── */}
      <div className="text-center pt-4">
        <h1 className="gold-gradient-text text-4xl font-black tracking-wider uppercase drop-shadow-[0_0_25px_rgba(245,196,81,0.4)]">
          GAME OVER
        </h1>
        <p className="text-zinc-400 text-xs tracking-wider uppercase mt-1 font-semibold">
          Final Rankings
        </p>
      </div>

      {/* ── Rankings Card ─────────────────────────── */}
      <section className="gold-panel w-full rounded-3xl p-5 my-4 space-y-2.5 overflow-y-auto max-h-[60vh]">
        {orderedPlayers
          .filter((entry) => !entry.isLoser)
          .map((entry) => {
            const isMe = entry.id === room.selfPlayerId;
            return (
              <div
                key={entry.id}
                className={[
                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                  isMe
                    ? 'bg-black/70 border-[#f5c451]/60 shadow-[0_0_12px_rgba(245,196,81,0.2)]'
                    : 'bg-black/40 border-zinc-800/80',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold min-w-[2rem]">
                    {getRankBadge(entry.rank, false)}
                  </span>
                  <div>
                    <span className="font-bold text-sm text-zinc-100 block">
                      {entry.username} {isMe ? '(You)' : ''}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {entry.rank === 1 ? '1st Place · Winner!' : `${getOrdinal(entry.rank)} Place`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Loser Section Matching Reference */}
        {loser && (
          <div className="mt-4 pt-4 border-t border-[#a87e2b]/30 text-center">
            <p className="text-xs text-zinc-400 mb-2">
              <span className="font-bold text-red-400">{loser.username}</span> is the last player remaining
            </p>
            <div className="w-full py-2.5 rounded-xl bg-red-950/70 border border-red-700/60 text-red-300 font-extrabold text-xs tracking-widest uppercase">
              💀 LAST PLACE
            </div>
          </div>
        )}
      </section>

      {/* ── Actions Matching Reference (PLAY AGAIN & LEAVE) ─────────────── */}
      <div className="pb-2 space-y-2">
        <button
          type="button"
          onClick={resetSession}
          className="w-full btn-play rounded-2xl py-4 font-black text-sm tracking-wider uppercase"
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={resetSession}
          className="w-full btn-gold rounded-2xl py-3 font-bold text-xs tracking-wider uppercase"
        >
          LEAVE
        </button>
      </div>
    </main>
  );
}
