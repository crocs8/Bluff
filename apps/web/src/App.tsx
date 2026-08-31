import { useState } from 'react';
import { useBluffSocket } from './socket-provider.js';
import { Landing, CreateRoom, JoinRoom } from './screens/LandingScreens.js';
import { Lobby } from './screens/Lobby.js';
import { GameTable } from './screens/GameTable.js';
import { GameOver } from './screens/GameOver.js';

type Screen = 'landing' | 'create' | 'join';

export default function App() {
  const { room, game, connection, removedNotice, clearRemovedNotice } = useBluffSocket();
  const [screen, setScreen] = useState<Screen>('landing');

  // ── Removed by Host Screen ────────────────────
  if (removedNotice) {
    return (
      <main className="mx-auto min-h-dvh max-w-md grid place-items-center text-center p-6 bg-[#0a0e14] text-white">
        <div className="w-full max-w-xs p-6 rounded-2xl bg-[#161c24] border border-red-500/40 shadow-2xl space-y-4">
          <div className="mx-auto size-16 rounded-full bg-red-500/20 grid place-items-center text-3xl text-red-400">
            🚫
          </div>
          <h2 className="text-xl font-bold text-red-400">Removed from Room</h2>
          <p className="text-sm text-zinc-300">{removedNotice}</p>
          <button
            onClick={clearRemovedNotice}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg"
          >
            RETURN TO HOME
          </button>
        </div>
      </main>
    );
  }

  // ── Reconnecting overlay / screen ─────────────
  if (connection === 'RECONNECTING') {
    return (
      <main className="mx-auto min-h-dvh max-w-md grid place-items-center text-center p-6 bg-[#0a0e14] text-white">
        <div className="w-full max-w-xs p-6 rounded-2xl bg-[#161c24] border border-[#f8cf52]/40 shadow-2xl space-y-4">
          <div className="mx-auto size-12 rounded-full border-4 border-[#f8cf52] border-t-transparent animate-spin" />
          <h2 className="text-lg font-bold text-[#f8cf52]">Welcome back!</h2>
          <p className="text-sm text-zinc-300">Rejoining your game…</p>
          <p className="text-xs text-zinc-500">(Do not close the tab)</p>
        </div>
      </main>
    );
  }

  // ── Game is active ────────────────────────────
  if (room?.gameStarted && game) {
    if (game.game.phase === 'GAME_END') {
      return <GameOver />;
    }
    return <GameTable />;
  }

  // ── In a lobby ────────────────────────────────
  if (room) {
    return <Lobby />;
  }

  // ── Pre-game screens ──────────────────────────
  if (screen === 'create') {
    return <CreateRoom onBack={() => setScreen('landing')} />;
  }
  if (screen === 'join') {
    return <JoinRoom onBack={() => setScreen('landing')} />;
  }

  // ── Loading state while connecting ────────────
  if (connection === 'CONNECTING') {
    return (
      <main className="mx-auto min-h-dvh max-w-md grid place-items-center text-center p-5">
        <div>
          <div className="mx-auto mb-4 size-12 rounded-full border-4 border-[#f8cf52] border-t-transparent animate-spin" />
          <p className="text-zinc-400 text-sm">Connecting…</p>
        </div>
      </main>
    );
  }

  return <Landing onNavigate={setScreen} />;
}
