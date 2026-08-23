import { useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';

// ── Landing screen ─────────────────────────────────
interface LandingProps {
  onNavigate: (screen: 'create' | 'join') => void;
}

export function Landing({ onNavigate }: LandingProps) {
  return (
    <main className="felt-bg mx-auto flex flex-col justify-between min-h-dvh max-w-md p-6 text-center safe-top safe-bottom select-none">
      {/* Top spacer */}
      <div className="pt-8">
        <p className="gold-text text-[11px] tracking-[0.45em] uppercase font-bold opacity-90">
          Multiplayer Card Game
        </p>
      </div>

      {/* Hero Center */}
      <div className="my-auto py-6">
        <h1
          className="text-7xl font-black tracking-tight drop-shadow-[0_0_35px_rgba(245,196,81,0.5)]"
          style={{
            background: 'linear-gradient(180deg, #fff2b8 0%, #f5c451 45%, #b88120 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          BLUFF
        </h1>

        <p className="mt-4 text-zinc-300 text-base italic font-serif tracking-wide">
          &ldquo;Who do you trust?&rdquo;
        </p>

        {/* Decorative divider */}
        <div className="my-8 flex items-center gap-3 justify-center px-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#a87e2b]" />
          <span className="text-[#f5c451] text-lg tracking-widest">♠ ♥ ♦ ♣</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#a87e2b]" />
        </div>

        {/* Action Buttons */}
        <div className="grid gap-3.5 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="btn-play rounded-2xl py-4 px-6 font-black text-base tracking-wider uppercase"
          >
            CREATE ROOM
          </button>
          <button
            type="button"
            onClick={() => onNavigate('join')}
            className="btn-skip rounded-2xl py-4 px-6 font-bold text-base tracking-wider uppercase"
          >
            JOIN ROOM
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-4">
        <p className="text-[11px] text-zinc-500 font-medium">
          2 – 10 players · Standard Deck · No Wagering
        </p>
      </div>
    </main>
  );
}

// ── Create Room Screen ─────────────────────────────
interface CreateRoomProps {
  onBack: () => void;
}

export function CreateRoom({ onBack }: CreateRoomProps) {
  const { create, error, submitting } = useBluffSocket();
  const [name, setName] = useState('');
  const [decks, setDecks] = useState<1 | 2>(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    create(name.trim());
  }

  return (
    <main className="felt-bg mx-auto flex flex-col justify-center min-h-dvh max-w-md p-5 safe-top safe-bottom select-none">
      <section className="gold-panel w-full rounded-3xl p-6 relative">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="gold-text text-sm font-bold flex items-center gap-1.5 mb-4 active:opacity-70"
        >
          <span>←</span>
          <span>BACK</span>
        </button>

        <h1 className="gold-gradient-text text-2xl font-black mb-6 tracking-wide">
          CREATE ROOM
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room / Player Name input */}
          <label className="block">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              Room / Host Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aryan's Room"
              maxLength={24}
              autoComplete="nickname"
              className="w-full rounded-xl border border-[#a87e2b]/50 bg-black/60 p-3.5 text-zinc-100 font-medium text-sm"
            />
          </label>

          {/* Number of Decks Toggle */}
          <div>
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              Number of Decks
            </span>
            <div className="grid grid-cols-2 gap-3">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDecks(n)}
                  className={[
                    'rounded-xl p-3 border text-center transition-all',
                    decks === n
                      ? 'border-[#f5c451] bg-[#4a350b]/80 text-[#f5c451] shadow-[0_0_12px_rgba(245,196,81,0.25)]'
                      : 'border-[#364e40] bg-black/40 text-zinc-400',
                  ].join(' ')}
                >
                  <span className="font-extrabold text-sm block">
                    {n} {n === 1 ? 'Deck' : 'Decks'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {n === 1 ? '2–6 players' : '5–10 players'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full btn-play rounded-xl py-4 font-black text-sm tracking-wider uppercase disabled:opacity-40"
          >
            {submitting ? 'CREATING…' : 'CREATE ROOM'}
          </button>
        </form>
      </section>
    </main>
  );
}

// ── Join Room Screen ───────────────────────────────
interface JoinRoomProps {
  onBack: () => void;
}

export function JoinRoom({ onBack }: JoinRoomProps) {
  const { join, error, submitting } = useBluffSocket();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || submitting) return;
    join(code.trim().toUpperCase(), name.trim());
  }

  return (
    <main className="felt-bg mx-auto flex flex-col justify-center min-h-dvh max-w-md p-5 safe-top safe-bottom select-none">
      <section className="gold-panel w-full rounded-3xl p-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="gold-text text-sm font-bold flex items-center gap-1.5 mb-4 active:opacity-70"
        >
          <span>←</span>
          <span>BACK</span>
        </button>

        <h1 className="gold-gradient-text text-2xl font-black mb-6 tracking-wide">
          JOIN ROOM
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              Your Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karan"
              maxLength={24}
              autoComplete="nickname"
              className="w-full rounded-xl border border-[#a87e2b]/50 bg-black/60 p-3.5 text-zinc-100 font-medium text-sm"
            />
          </label>

          <label className="block">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1.5">
              Enter Room ID
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BLF59872"
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-xl border border-[#a87e2b]/50 bg-black/60 p-3.5 text-zinc-100 font-bold text-base tracking-widest"
            />
          </label>

          {/* Error display */}
          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !name.trim() || !code.trim()}
            className="w-full btn-play rounded-xl py-4 font-black text-sm tracking-wider uppercase disabled:opacity-40"
          >
            {submitting ? 'JOINING…' : 'JOIN ROOM'}
          </button>
        </form>

        {/* Recent Rooms section matching reference */}
        <div className="mt-6 pt-5 border-t border-[#a87e2b]/30">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
            Recent Rooms
          </span>
          <div className="space-y-1.5">
            {['BLF59872', 'KING88421', 'PLAY77825'].map((recentCode) => (
              <button
                key={recentCode}
                type="button"
                onClick={() => setCode(recentCode)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-xs font-semibold"
              >
                <span>{recentCode}</span>
                <span className="text-zinc-600">&gt;</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
