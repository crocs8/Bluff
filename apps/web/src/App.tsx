import { useState } from 'react';
import { useBluffSocket } from './socket-provider.js';
import { Landing, CreateRoom, JoinRoom } from './screens/LandingScreens.js';
import { Lobby } from './screens/Lobby.js';
import { GameTable } from './screens/GameTable.js';
import { GameOver } from './screens/GameOver.js';

type Screen = 'landing' | 'create' | 'join';

export default function App() {
  const { room, game, connection } = useBluffSocket();
  const [screen, setScreen] = useState<Screen>('landing');

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
