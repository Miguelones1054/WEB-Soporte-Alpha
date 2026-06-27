'use client';

import { ReactNode, useEffect } from 'react';
import { playRetroSound, unlockRetroSounds } from '../../lib/retroSounds';

const NAV_SELECTORS =
  '.retro-hub-sidebar__link, .retro-hub-app-card, a[href*="/admin-panel?"]';

const CLICK_SELECTORS = [
  'button.retro-btn',
  'button.retro-manager-btn',
  '.retro-admin-gestion__action-btn',
  'button.retro-hub-sidebar__logout',
  'button.retro-registros__filter-btn',
  'button.retro-icon-btn',
  'button.retro-titlebar__close-btn',
  'button.retro-hub-profile-btn',
  'button.retro-hub-header__menu-btn',
  'button.retro-user-actions__btn',
  'button.retro-manager-modal__copy-btn',
  'button.retro-filter-btn',
].join(', ');

interface RetroSoundProviderProps {
  children: ReactNode;
}

export function RetroSoundProvider({ children }: RetroSoundProviderProps) {
  useEffect(() => {
    const onFirstInteraction = () => {
      unlockRetroSounds();
    };

    window.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true, capture: true });

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-retro-sound="off"]')) return;

      const button = target.closest('button');
      if (button?.disabled) return;

      if (target.closest(NAV_SELECTORS)) {
        playRetroSound('navigate');
        return;
      }

      if (target.closest(CLICK_SELECTORS)) {
        playRetroSound('click');
      }
    };

    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction, true);
      window.removeEventListener('keydown', onFirstInteraction, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return children;
}
