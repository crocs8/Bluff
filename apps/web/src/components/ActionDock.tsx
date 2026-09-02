import { useEffect, useRef, useState } from 'react';
import { QUICK_CHAT_IDS, QUICK_CHAT_MESSAGES, RANKS, type Card, type Rank } from '@bluff/shared';
import { CardView, TurnTimer } from './shared.js';
import { useBluffSocket } from '../socket-provider.js';

const RANK_ORDER: Record<Rank, number> = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
};

export function ActionDock() {
  const { game, room, play, skip, callBluff, submitting, error, clearError, sendQuickChat } = useBluffSocket();
  const [selected, setSelected] = useState<string[]>([]);
  const [claimedRank, setClaimedRank] = useState<Rank>('A');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orderedCardIds, setOrderedCardIds] = useState<string[]>([]);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const deadline = game?.turnDeadlineAt;
  useEffect(() => {
    if (deadline === undefined) {
      setSecondsLeft(0);
      return;
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);

  // Close quick chat menu on outside click
  useEffect(() => {
    if (!showChatMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  if (!game || !room) return null;

  const { legalActions, hand, roundNumber, roundLockedRank } = game.game;
  const isMyTurn = legalActions.canPlay || legalActions.canSkip || legalActions.canCallBluff;

  // Synchronize local visual ordering with incoming authoritative hand
  useEffect(() => {
    const cardMap = new Map(hand.map((c) => [c.id, c]));

    setOrderedCardIds((prev) => {
      // Keep existing ordered IDs that are still in hand
      const existing = prev.filter((id) => cardMap.has(id));
      const existingSet = new Set(existing);

      // Find any newly received cards from server (e.g., after challenge or deal)
      const newlyReceived = hand.filter((c) => !existingSet.has(c.id)).map((c) => c.id);

      // If no overlap with previous IDs (e.g. initial deal or fresh round)
      if (existing.length === 0) {
        return hand.map((c) => c.id);
      }

      // If cards were played or new cards received, append new cards to the right without re-sorting
      if (newlyReceived.length > 0 || existing.length !== prev.length) {
        return [...existing, ...newlyReceived];
      }

      return prev;
    });
  }, [hand]);

  useEffect(() => {
    if (roundLockedRank) {
      setClaimedRank(roundLockedRank);
    }
  }, [roundNumber, roundLockedRank]);

  function toggleCard(id: string) {
    if (!legalActions.canPlay) return;
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= legalActions.maxPlayCards
          ? cur
          : [...cur, id],
    );
  }

  function handlePlay() {
    if (selected.length === 0 || !legalActions.canPlay || submitting) return;
    play(selected, roundLockedRank ?? claimedRank);
    setSelected([]);
  }

  function handleSkip() {
    if (!legalActions.canSkip || submitting) return;
    skip();
    setSelected([]);
  }

  function handleCallBluff() {
    if (!legalActions.canCallBluff || submitting) return;
    callBluff();
    setSelected([]);
  }

  // Local Sort by Rank: A -> 2 -> 3 -> ... -> K
  function handleSort() {
    const sorted = [...hand].sort((a, b) => {
      const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    });
    setOrderedCardIds(sorted.map((c) => c.id));
  }

  // Map ordered IDs back to Card objects
  const cardMap = new Map(hand.map((c) => [c.id, c]));
  const displayCards: Card[] = orderedCardIds
    .map((id) => cardMap.get(id))
    .filter((c): c is Card => c !== undefined);
  const renderedCards = displayCards.length === hand.length ? displayCards : hand;

  return (
    <section className="w-full shrink-0 select-none z-20 flex flex-col justify-end relative">
      {/* Error banner if action fails */}
      {error && (
        <div className="px-3 pb-1 max-w-md mx-auto w-full">
          <div className="rounded-xl bg-red-950/95 border border-red-700/80 p-2 flex items-center justify-between text-xs text-red-200 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-sm">⚠</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-zinc-400 hover:text-white px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Chat Preset Picker Menu ─────────────── */}
      {showChatMenu && (
        <div className="px-3 pb-2 max-w-sm sm:max-w-md mx-auto w-full z-50">
          <div
            ref={chatMenuRef}
            className="bg-[#0b1410]/95 border-2 border-[#d4af37] rounded-2xl p-2.5 sm:p-3 shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_18px_rgba(212,175,55,0.3)] animate-fade-in backdrop-blur-md"
          >
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#a87e2b]/40 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💬</span>
                <span className="gold-text font-black text-[11px] sm:text-xs uppercase tracking-wider">
                  QUICK CHAT
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowChatMenu(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded active:scale-95"
                title="Close chat menu"
                aria-label="Close chat menu"
              >
                ✕
              </button>
            </div>

            {/* 2-Column Preset Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_CHAT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    sendQuickChat(id);
                    setShowChatMenu(false);
                  }}
                  className="bg-[#14231b] hover:bg-[#1f372a] active:scale-95 border border-[#a87e2b]/50 hover:border-[#f5c451] text-zinc-100 hover:text-white rounded-xl py-2 px-2.5 text-left text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm truncate"
                >
                  <span className="truncate">{QUICK_CHAT_MESSAGES[id]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hand Header: Selection info & Sort Button ── */}
      <div className="flex items-center justify-between px-4 max-w-lg mx-auto w-full mb-0.5">
        <span className="text-[11px] text-zinc-400 font-semibold tracking-wide">
          {isMyTurn && legalActions.canPlay
            ? `Select 1 – ${legalActions.maxPlayCards} cards`
            : `${hand.length} Cards in Hand`}
        </span>

        {/* Local UI Sort Button */}
        <button
          type="button"
          onClick={handleSort}
          disabled={hand.length <= 1}
          className="px-2.5 py-1 rounded-lg bg-black/60 border border-[#a87e2b]/60 text-[#f5c451] font-extrabold text-[11px] hover:bg-black/80 active:scale-95 transition-all flex items-center gap-1 shadow-sm disabled:opacity-35 disabled:pointer-events-none"
          title="Sort hand by rank (A to K)"
        >
          <span>SORT</span>
          <span className="text-[10px]">↕</span>
        </button>
      </div>

      {/* ── Horizontally Scrollable Player's Hand ─────── */}
      <div className="relative w-full max-w-2xl mx-auto overflow-x-auto no-scrollbar touch-pan-x py-2.5 px-3">
        {hand.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-xs font-semibold">
            No cards in hand
          </div>
        ) : (
          <div className="flex items-end min-w-max justify-start sm:justify-center -space-x-3.5 sm:-space-x-4 px-2">
            {renderedCards.map((card, idx) => (
              <div
                key={card.id}
                style={{ zIndex: idx + 1 }}
                className="transition-transform duration-150"
              >
                <CardView
                  card={card}
                  selected={selected.includes(card.id)}
                  onClick={() => toggleCard(card.id)}
                  disabled={!legalActions.canPlay}
                  size="md"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Unlocked Rank Selector Strip (Only shown on unstarted round) ── */}
      {roundLockedRank === undefined && legalActions.canPlay && (
        <div className="px-3 max-w-md mx-auto w-full mb-1">
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {RANKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setClaimedRank(r)}
                className={[
                  'rank-strip-btn min-w-[1.5rem] h-7 rounded text-[11px] font-bold shrink-0 transition-transform active:scale-95',
                  claimedRank === r ? 'active' : '',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Controls & Timer Bar ─────────────── */}
      <div className="max-w-md mx-auto w-full px-3 pb-2 safe-bottom">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Circular Turn Timer */}
          <TurnTimer
            secondsLeft={secondsLeft}
            totalSeconds={30}
            isMyTurn={isMyTurn}
          />

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {/* SKIP */}
            <button
              type="button"
              disabled={!legalActions.canSkip || submitting}
              onClick={handleSkip}
              className={[
                'btn-skip rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canSkip || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span>SKIP</span>
              <span className="text-xs font-black">&gt;&gt;</span>
            </button>

            {/* PLAY */}
            <button
              type="button"
              disabled={!legalActions.canPlay || selected.length === 0 || submitting}
              onClick={handlePlay}
              className={[
                'btn-play rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-black text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canPlay || selected.length === 0 || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span>PLAY</span>
              {selected.length > 0 && <span className="text-[11px] font-normal">({selected.length})</span>}
            </button>

            {/* CALL BLUFF */}
            <button
              type="button"
              disabled={!legalActions.canCallBluff || submitting}
              onClick={handleCallBluff}
              className={[
                'btn-bluff rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-black text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canCallBluff || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span className="text-xs">⚠</span>
              <span>CALL BLUFF</span>
            </button>
          </div>

          {/* Quick Chat Button 💬 */}
          <button
            type="button"
            onClick={() => setShowChatMenu((prev) => !prev)}
            className={[
              'size-11 sm:size-12 shrink-0 rounded-2xl border flex items-center justify-center text-base sm:text-lg shadow-md transition-all active:scale-95',
              showChatMenu
                ? 'bg-amber-950 border-[#f5c451] shadow-[0_0_12px_rgba(245,196,81,0.5)] scale-105'
                : 'bg-black/70 border-[#a87e2b]/80 hover:border-[#f5c451] hover:bg-black/90 text-[#f5c451]',
            ].join(' ')}
            title="Quick Chat"
            aria-label="Quick Chat"
          >
            💬
          </button>
        </div>
      </div>
    </section>
  );
}
