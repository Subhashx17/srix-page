// The opening move (step 6). Runs once per session, after the fonts load:
// the lens glides to the hero, drills to depth 3.2, holds, and rises back.
// Any user input cancels it at once. Add ?intro to the URL to replay it.
// Exports: startIntro, showHint

import { moveTo, setAuto, setDepthTarget } from './lens.js';

const SEEN_KEY = 'underneath:intro-seen';
const START_DELAY_MS = 700; // wait after the fonts are ready
const GLIDE_MS = 1300; // top-right to the hero name
const DRILL_MS = 2400; // peek depth to END_DEPTH
const HOLD_MS = 500;
const RISE_MS = 1300;
const PEEK_DEPTH = 0.5; // the lens is a little open while it glides, so you can see it
const END_DEPTH = 3.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let state = 'idle'; // idle, waiting, running, done
let rafId = 0;
let startTimer = 0;
let t0 = 0;
let scrollStart = 0;
let abort = null;
let from = { x: 0, y: 0 };
let to = { x: 0, y: 0 };
let hintText = '';

function wasSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch (err) {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch (err) {
    /* storage can be blocked: then the intro may play again, that is fine */
  }
}

// Fades the hint in at its reserved spot in the hero.
export function showHint() {
  const el = document.querySelector('.hero__hint');
  if (!el) return;
  if (!el.textContent.trim() && hintText) el.textContent = hintText;
  el.classList.add('is-visible');
}

// Where the lens should stop: on the big hero heading.
function heroTarget() {
  const h =
    document.querySelector('#surface [data-block="hero"] h1') ||
    document.querySelector('#surface [data-block="hero"]');
  if (!h) return null;
  const r = h.getBoundingClientRect();
  if (r.width < 40 || r.height < 20) return null;
  if (r.bottom < 0 || r.top > window.innerHeight) return null;
  return {
    x: clamp(r.left + Math.min(r.width * 0.35, 260), 60, window.innerWidth - 60),
    y: clamp(r.top + r.height * 0.5, 60, window.innerHeight - 60),
  };
}

// Stops everything and gives control back. Used for cancel and for the normal end.
function end() {
  if (state === 'done') return;
  const wasRunning = state === 'running';
  state = 'done';
  cancelAnimationFrame(rafId);
  rafId = 0;
  clearTimeout(startTimer);
  startTimer = 0;
  abort?.abort();
  abort = null;
  if (wasRunning) {
    setAuto(false);
    setDepthTarget(0);
  }
  showHint();
}

function frame(now) {
  rafId = 0;
  if (state !== 'running') return;
  if (!t0) t0 = now;
  const t = now - t0;

  const glideEnd = GLIDE_MS;
  const drillEnd = glideEnd + DRILL_MS;
  const holdEnd = drillEnd + HOLD_MS;
  const riseEnd = holdEnd + RISE_MS;

  if (t >= riseEnd) {
    end();
    return;
  }

  if (t < glideEnd) {
    const p = ease(t / GLIDE_MS);
    moveTo(lerp(from.x, to.x, p), lerp(from.y, to.y, p));
    setDepthTarget(PEEK_DEPTH * ease(t / 450));
  } else if (t < drillEnd) {
    setDepthTarget(lerp(PEEK_DEPTH, END_DEPTH, ease((t - glideEnd) / DRILL_MS)));
  } else if (t < holdEnd) {
    setDepthTarget(END_DEPTH);
  } else {
    setDepthTarget(END_DEPTH * (1 - ease((t - holdEnd) / RISE_MS)));
  }

  rafId = requestAnimationFrame(frame);
}

function begin() {
  startTimer = 0;
  if (state !== 'waiting') return;
  const target = heroTarget();
  if (!target) {
    end();
    return;
  }
  markSeen();
  from = { x: window.innerWidth - 90, y: 90 };
  to = target;
  state = 'running';
  t0 = 0;
  setAuto(true);
  moveTo(from.x, from.y);
  setDepthTarget(0);
  rafId = requestAnimationFrame(frame);
}

// Any input cancels. These listeners run in the capture phase, so they run BEFORE the
// lens listeners: the lens is free again by the time it sees the same event.
function listen() {
  abort = new AbortController();
  scrollStart = window.scrollY;
  const o = { capture: true, passive: true, signal: abort.signal };

  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((type) =>
    window.addEventListener(type, end, o)
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      // Ignore fake moves (the browser sends them when the page moves under the mouse).
      const real = !('movementX' in e) || e.movementX !== 0 || e.movementY !== 0;
      if (real) end();
    },
    o
  );

  window.addEventListener(
    'scroll',
    () => {
      if (Math.abs(window.scrollY - scrollStart) > 2) end();
    },
    o
  );
}

export function startIntro(options = {}) {
  if (state !== 'idle') return;
  hintText = options.hint || '';

  const force = /[?&]intro(?:[=&]|$)/.test(window.location.search);
  if (reducedMotion() || (!force && wasSeen())) {
    state = 'done';
    showHint();
    return;
  }

  state = 'waiting';
  listen();

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  Promise.race([fontsReady, timeout]).then(() => {
    if (state !== 'waiting') return;
    startTimer = window.setTimeout(begin, START_DELAY_MS);
  });
}