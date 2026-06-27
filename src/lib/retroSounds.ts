export type RetroSoundId = 'click' | 'navigate' | 'success' | 'error' | 'warning';

const SOUND_FILES: Record<RetroSoundId, string> = {
  click: '/sounds/win98/ding.wav',
  navigate: '/sounds/win98/menu-command.wav',
  success: '/sounds/win98/notify.wav',
  error: '/sounds/win98/error.wav',
  warning: '/sounds/win98/exclamation.wav',
};

const STORAGE_KEY = 'admin_retro_sounds_enabled';

const VOLUME: Record<RetroSoundId, number> = {
  click: 0.38,
  navigate: 0.42,
  success: 0.48,
  warning: 0.45,
  error: 0.52,
};

let unlocked = false;
let enabled = true;
const cache = new Map<RetroSoundId, HTMLAudioElement>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isRetroSoundsEnabled(): boolean {
  if (!isBrowser()) return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setRetroSoundsEnabled(value: boolean): void {
  if (!isBrowser()) return;
  enabled = value;
  localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}

export function unlockRetroSounds(): void {
  if (!isBrowser() || unlocked) return;
  unlocked = true;
  enabled = isRetroSoundsEnabled();

  (Object.keys(SOUND_FILES) as RetroSoundId[]).forEach((id) => {
    const audio = new Audio(SOUND_FILES[id]);
    audio.preload = 'auto';
    cache.set(id, audio);
  });
}

export function playRetroSound(id: RetroSoundId): void {
  if (!isBrowser() || !enabled) return;

  if (!unlocked) {
    unlockRetroSounds();
  }

  const source = cache.get(id) ?? new Audio(SOUND_FILES[id]);
  if (!cache.has(id)) {
    source.preload = 'auto';
    cache.set(id, source);
  }

  const audio = source.cloneNode(true) as HTMLAudioElement;
  audio.volume = VOLUME[id];
  void audio.play().catch(() => {
    /* Autoplay bloqueado hasta interacción del usuario */
  });
}
