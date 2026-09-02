import { describe, expect, it } from 'vitest';
import { QUICK_CHAT_IDS, QUICK_CHAT_MESSAGES, type QuickChatMessageId } from '@bluff/shared';

describe('Quick Chat Preset System', () => {
  const EXPECTED_MESSAGES: Record<QuickChatMessageId, string> = {
    PAKADO: '🧢 Pakado',
    CHAL_CHAL_CHAL: '😏 Chal Chal Chal',
    I_SEE_YOU: '👀 I see you...',
    SERIOUSLY: '🤨 Seriously?',
    NO_WAY: '😭 No way!',
    BLUFF_KAR_RAHA_HAI: '😈 Bluff kar raha hai',
    PAKDA_GAYA: '💀 Pakda gaya',
    KYA_BAAT_HAI: '🫡 Kya baat hai',
    LETS_GO: "🔥 Let's go!",
    LOL: '😂 LOL',
    MUJHE_Q_TODA: '😭 Mujhe Q toda?',
    MKB_BLUFF: '🗿 MKB BLUFF',
  };

  it('contains exactly 12 preset messages', () => {
    expect(QUICK_CHAT_IDS).toHaveLength(12);
    expect(Object.keys(QUICK_CHAT_MESSAGES)).toHaveLength(12);
  });

  it('matches all 12 expected message IDs and displayed text strings', () => {
    for (const [id, text] of Object.entries(EXPECTED_MESSAGES)) {
      expect(QUICK_CHAT_MESSAGES[id as QuickChatMessageId]).toBe(text);
      expect(QUICK_CHAT_IDS).toContain(id);
    }
  });
});
