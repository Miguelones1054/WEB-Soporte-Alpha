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
  '.retro-tableview-panel',
  '.retro-page--auth .retro-panel__body',
].join(', ');

const SCROLL_LOCK_ROOT_SELECTOR = '.retro-modal-root, .retro-drawer';

function canElementScroll(el: HTMLElement): boolean {
  return (
    el.scrollHeight > el.clientHeight + 1 ||
    el.scrollWidth > el.clientWidth + 1
  );
}

function isAllowedScrollTarget(el: HTMLElement): boolean {
  return (
    Boolean(el.closest(SCROLL_LOCK_ROOT_SELECTOR)) ||
    el.matches(ALLOW_SCROLL_SELECTOR) ||
    Boolean(el.closest(ALLOW_SCROLL_SELECTOR))
  );
}

function findScrollableFromTarget(target: Element): HTMLElement | null {
  let node: Element | null = target;
  while (node && node instanceof HTMLElement) {
    if (canElementScroll(node) && isAllowedScrollTarget(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function onTouchMove(e: TouchEvent) {
  const target = e.target;
  if (!(target instanceof Element)) {
    e.preventDefault();
    return;
  }

  if (findScrollableFromTarget(target)) {
    return;
  }

  e.preventDefault();
}

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
