'use client';

import { useEffect } from 'react';

const LOCK_CLASS = 'retro-scroll-locked';

const SCROLL_CONTAINER_SELECTOR = [
  '.retro-hub-main',
  '.retro-hub-sidebar--desktop',
  '.retro-page.retro-admin .retro-hub-panel .retro-panel__body',
  '.retro-page.retro-admin .retro-hub-section-body',
  '.retro-page.retro-admin > :not(.retro-hub-layout)',
  '.retro-page--auth .retro-panel__body',
].join(', ');

const ALLOW_SCROLL_SELECTOR = [
  '.retro-modal__body',
  '.retro-drawer__body',
  '.retro-manager-modal__body',
].join(', ');

let lockCount = 0;
let touchMoveListener: ((e: TouchEvent) => void) | null = null;

function lockScrollContainers() {
  document.documentElement.classList.add(LOCK_CLASS);
  document.body.classList.add(LOCK_CLASS);

  document.querySelectorAll<HTMLElement>(SCROLL_CONTAINER_SELECTOR).forEach((el) => {
    if (el.dataset.retroScrollLock) return;
    el.dataset.retroScrollLock = '1';
    el.dataset.retroScrollLockPrevOverflow = el.style.overflow || '';
    el.style.overflow = 'hidden';
  });
}

function unlockScrollContainers() {
  document.documentElement.classList.remove(LOCK_CLASS);
  document.body.classList.remove(LOCK_CLASS);

  document.querySelectorAll<HTMLElement>('[data-retro-scroll-lock="1"]').forEach((el) => {
    el.style.overflow = el.dataset.retroScrollLockPrevOverflow ?? '';
    delete el.dataset.retroScrollLock;
    delete el.dataset.retroScrollLockPrevOverflow;
  });
}

function onTouchMove(e: TouchEvent) {
  const target = e.target;
  if (!(target instanceof Element)) {
    e.preventDefault();
    return;
  }

  const scrollable = target.closest(ALLOW_SCROLL_SELECTOR) as HTMLElement | null;
  if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
    return;
  }

  e.preventDefault();
}

export function acquireScrollLock(): () => void {
  lockCount += 1;
  if (lockCount === 1) {
    lockScrollContainers();
    touchMoveListener = onTouchMove;
    document.addEventListener('touchmove', touchMoveListener, { passive: false });
  }

  return () => {
    lockCount -= 1;
    if (lockCount <= 0) {
      lockCount = 0;
      if (touchMoveListener) {
        document.removeEventListener('touchmove', touchMoveListener);
        touchMoveListener = null;
      }
      unlockScrollContainers();
    }
  };
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return acquireScrollLock();
  }, [active]);
}
