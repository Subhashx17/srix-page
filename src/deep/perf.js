// Speed helpers (step 7).
// 1) Pauses every CSS animation while the tab is hidden (html.tab-hidden).
// 2) Portal fallback: each layer becomes a small circle div at the lens position and its
//    content is shifted the opposite way (see deep.css, html.is-portal).
//    Turned on when the URL has ?portal, or when FPS stays below 45 for 2 seconds
//    while the lens is open. It stays on until the page is reloaded.
// Exports: startPerf, stopPerf, setPortal, isPortal

import { onDepth, getDepth } from './lens.js';

const LOW_FPS = 45;
const WINDOW_MS = 2000;
const WARMUP_MS = 400;

let started = false;
let abort = null;
let off = null;
let raf = 0;
let portal = false;
let t0 = 0;
let winStart = 0;
let frames = 0;

export function isPortal() {
  return portal;
}

export function setPortal(on) {
  portal = !!on;
  document.documentElement.classList.toggle('is-portal', portal);
}

function resetWindow() {
  t0 = 0;
  winStart = 0;
  frames = 0;
}

function loop(now) {
  raf = 0;
  if (document.hidden || getDepth() <= 0.01) {
    resetWindow();
    return;
  }
  raf = requestAnimationFrame(loop);
  if (!t0) {
    t0 = now;
    return;
  }
  if (now - t0 < WARMUP_MS) return; // the first frames are always slow
  if (!winStart) {
    winStart = now;
    frames = 0;
    return;
  }
  frames += 1;
  const span = now - winStart;
  if (span >= WINDOW_MS) {
    const fps = (frames * 1000) / span;
    winStart = now;
    frames = 0;
    if (fps < LOW_FPS) {
      console.info('[perf] ' + Math.round(fps) + ' fps while drilling: portal mode on');
      setPortal(true);
      cancelAnimationFrame(raf);
      raf = 0;
      off?.();
      off = null;
    }
  }
}

export function stopPerf() {
  if (!started) return;
  started = false;
  abort?.abort();
  abort = null;
  off?.();
  off = null;
  cancelAnimationFrame(raf);
  raf = 0;
  resetWindow();
  document.documentElement.classList.remove('tab-hidden', 'is-portal');
  portal = false;
}

export function startPerf() {
  if (started) return stopPerf;
  started = true;
  abort = new AbortController();

  document.addEventListener(
    'visibilitychange',
    () => {
      document.documentElement.classList.toggle('tab-hidden', document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        resetWindow();
      }
    },
    { signal: abort.signal }
  );
  document.documentElement.classList.toggle('tab-hidden', document.hidden);

  if (/[?&]portal(?:[=&]|$)/.test(window.location.search)) {
    setPortal(true); // forced: no FPS check needed
    return stopPerf;
  }

  off = onDepth((depth) => {
    if (portal || raf || document.hidden || depth <= 0.01) return;
    resetWindow();
    raf = requestAnimationFrame(loop);
  });
  return stopPerf;
}