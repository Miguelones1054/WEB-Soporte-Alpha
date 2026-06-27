'use client';

import {
  isRetroSoundsEnabled,
  playRetroSound,
  setRetroSoundsEnabled,
  type RetroSoundId,
} from '../lib/retroSounds';

export function useRetroSounds() {
  return {
    play: (id: RetroSoundId) => playRetroSound(id),
    isEnabled: isRetroSoundsEnabled,
    setEnabled: setRetroSoundsEnabled,
  };
}
