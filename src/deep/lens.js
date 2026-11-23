// The lens. Follows the pointer, drills down on hold, writes CSS variables on #deep.
// Step 7: touch long-press 250ms with the lens 72px above the finger, "peel" (one layer on the
// whole screen), instant moves with reduced motion, pause when the tab is hidden.
// Exports: startLens, stopLens, moveTo, setDepthTarget, setAuto, getDepth, isHolding, onDepth,
//          setPeel, getPeel

const MAX_RADII = [170, 125, 85, 50]; // layer 1 to 4, in px
const MAX_DEPTH = 4;
const HOLD_MS = 200; // mouse: press this long to start drilling
const HOLD_MS_TOUCH = 250; // finger: long-press
const TOUCH_OFFSET_Y = 72; // the lens sits this many px above the finger
const RISE_PER_SEC = 1.1; // layers per second while held
const FOLLOW = 14; // how fast the lens catches the pointer
const OMEGA = 11; // spring speed when letting go
const ZETA = 0.5; // spring bounce (1 = no bounce)
const TOUCH_MOVE_LIMIT = 10; // px: more than this before the hold = the finger is scrolling
const CLICK_BLOCK_MS = 400;
const PEEL_SECS = 0.45; // time for a layer to grow over the whole screen

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOutSine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const isTextField = (t) =>
  t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]');
// Presses on our own buttons and panels must never start a drill.
const isNoLens = (t) =>
  isTextField(t) ||
  (t instanceof Element && !!t.closest('[data-no-lens], .sound-toggle, #human'));

let started = false;
let abort = null;
let root = null;
let rings = [];
let rafId = 0;
let lastT = 0;

const pos = { x: 0, y: 0 }; // where the lens is
const goal = { x: 0, y: 0 }; // where it is going
let depth = 0; // 0 to 4 (can dip a little below 0 while springing)
let vel = 0;
let depthTarget = 0;
let auto = false;

// Peel: one layer shown on the whole screen.
let peelN = 0; // 0 = none, else 1 to 4 (stays set while it closes)
let peelTarget = 0; // 1 = open, 0 = closed
let peelK = 0; // 0 to 1, animated

let pointerDown = false;
let pointerDrill = false;
let keyDrill = false;
let holding = false;
let touchPress = false; // the current press is a finger
let touchBlocker = null;
let holdTimer = 0;
let downX = 0;
let downY = 0;
let suppressUntil = 0;
let seenPointer = false;

const listeners = new Set();
const ringOpen = [false, false, false, false];
let openState = false;
let peeledState = false;

/* ---------- small helpers ---------- */

function effectiveDepth() {
  return Math.max(clamp(depth, 0, MAX_DEPTH), peelN);
}

function activeLayer(d) {
  return d <= 0.02 ? 0 : Math.min(4, Math.ceil(d - 1e-6));
}

function kick() {
  if (!started || rafId || document.hidden) return;
  lastT = 0;
  rafId = requestAnimationFrame(tick);
}

function clearSelection() {
  window.getSelection?.()?.removeAllRanges();
}

// A non-passive touchmove handler exists ONLY while a finger is drilling.
// Without it the page scrolls normally.
function blockTouchScroll(on) {
  if (on && !touchBlocker) {
    touchBlocker = (e) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', touchBlocker, { passive: false });
  } else if (!on && touchBlocker) {
    document.removeEventListener('touchmove', touchBlocker);
    touchBlocker = null;
  }
}

function refreshHolding() {
  if (root) root.classList.toggle('is-pressing', pointerDown && !(pointerDrill || keyDrill));
  const now = pointerDrill || keyDrill;
  if (now === holding) return;
  holding = now;
  document.documentElement.classList.toggle('is-drilling', holding);
  blockTouchScroll(holding && touchPress);
  if (holding) clearSelection();
  kick();
}

function releaseAll() {
  clearTimeout(holdTimer);
  holdTimer = 0;
  pointerDown = false;
  pointerDrill = false;
  keyDrill = false;
  refreshHolding();
}

function setGoal(x, y) {
  goal.x = x;
  goal.y = y;
  if (!seenPointer) {
    pos.x = x;
    pos.y = y;
    seenPointer = true;
  }
  kick();
}

// Where the lens goes for a finger at (x, y): 72px above it, always on screen.
const touchGoalY = (y) => Math.max(8, y - TOUCH_OFFSET_Y);

/* ---------- the animation loop ---------- */

function springDepth(dt) {
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const before = depth - depthTarget;
    const acc = -OMEGA * OMEGA * before - 2 * ZETA * OMEGA * vel;
    vel += acc * h;
    depth += vel * h;
  }
  if (Math.abs(depth - depthTarget) < 0.002 && Math.abs(vel) < 0.01) {
    depth = depthTarget;
    vel = 0;
  }
  depth = clamp(depth, -1, MAX_DEPTH);
}

function step(dt) {
  const calm = reducedMotion(); // reduced motion: no easing, no spring, instant swaps
  const k = calm ? 1 : 1 - Math.exp(-FOLLOW * dt);
  pos.x += (goal.x - pos.x) * k;
  pos.y += (goal.y - pos.y) * k;
  if (Math.abs(goal.x - pos.x) < 0.05) pos.x = goal.x;
  if (Math.abs(goal.y - pos.y) < 0.05) pos.y = goal.y;

  if (holding) {
    depth = Math.min(MAX_DEPTH, depth + RISE_PER_SEC * dt);
    vel = 0;
  } else if (calm) {
    depth = depthTarget;
    vel = 0;
  } else {
    springDepth(dt);
  }

  if (calm) peelK = peelTarget;
  else if (peelK < peelTarget) peelK = Math.min(peelTarget, peelK + dt / PEEL_SECS);
  else if (peelK > peelTarget) peelK = Math.max(peelTarget, peelK - dt / PEEL_SECS);
  if (!peelTarget && peelK <= 0) peelN = 0; // fully closed
}

function render() {
  root.style.setProperty('--lx', `${pos.x.toFixed(1)}px`);
  root.style.setProperty('--ly', `${pos.y.toFixed(1)}px`);
  const big = Math.hypot(window.innerWidth, window.innerHeight) + 4; // covers the screen from anywhere
  const pe = easeInOutSine(peelK);
  MAX_RADII.forEach((max, i) => {
    let r = max * easeInOutSine(clamp(depth - i, 0, 1));
    if (peelN) r = i === peelN - 1 ? r + (big - r) * pe : r * (1 - pe);
    root.style.setProperty(`--r${i + 1}`, `${r.toFixed(1)}px`);
    const open = r > 0.5;
    if (open !== ringOpen[i]) {
      ringOpen[i] = open;
      rings[i]?.classList.toggle('is-open', open);
    }
  });
  const isOpen = effectiveDepth() > 0.01;
  if (isOpen !== openState) {
    openState = isOpen;
    root.classList.toggle('is-open', isOpen);
  }
  const peeled = peelN > 0;
  if (peeled !== peeledState) {
    peeledState = peeled;
    root.classList.toggle('is-peeled', peeled);
  }
}

function notify() {
  if (!listeners.size) return;
  const d = getDepth();
  const info = { x: pos.x, y: pos.y, holding, layer: activeLayer(d) };
  listeners.forEach((fn) => fn(d, info));
}

function isMoving() {
  const lensBusy = Math.abs(goal.x - pos.x) > 0.1 || Math.abs(goal.y - pos.y) > 0.1;
  const depthBusy = holding
    ? depth < MAX_DEPTH
    : Math.abs(depth - depthTarget) > 0.0005 || Math.abs(vel) > 0.001;
  return lensBusy || depthBusy || peelK !== peelTarget;
}

function tick(now) {
  rafId = 0;
  if (document.hidden) return; // hidden tab: no frames at all
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
  lastT = now;
  step(dt);
  render();
  notify();
  if (isMoving()) rafId = requestAnimationFrame(tick);
  else lastT = 0; // nothing moves: the loop stops here
}

/* ---------- input ---------- */

function onPointerMove(e) {
  if (auto || !e.isPrimary) return;
  if (e.pointerType === 'touch') {
    if (!pointerDown) return;
    if (!holding) {
      // A finger that moves before the long-press fires is scrolling.
      if (holdTimer && Math.hypot(e.clientX - downX, e.clientY - downY) > TOUCH_MOVE_LIMIT) {
        clearTimeout(holdTimer);
        holdTimer = 0;
      }
      return;
    }
    setGoal(e.clientX, touchGoalY(e.clientY)); // dragging moves the lens
    return;
  }
  if (root.dataset.cursor !== 'on') root.dataset.cursor = 'on';
  setGoal(e.clientX, e.clientY);
}

function onPointerDown(e) {
  if (auto || !e.isPrimary) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (isNoLens(e.target)) return;

  const touch = e.pointerType === 'touch';
  touchPress = touch;
  pointerDown = true;
  pointerDrill = false;
  downX = e.clientX;
  downY = e.clientY;

  if (touch) {
    pos.x = goal.x = e.clientX;
    pos.y = goal.y = touchGoalY(e.clientY);
    seenPointer = true;
    root.dataset.cursor = 'off';
  } else {
    root.dataset.cursor = 'on';
    setGoal(e.clientX, e.clientY);
  }

  clearTimeout(holdTimer);
  holdTimer = window.setTimeout(
    () => {
      holdTimer = 0;
      if (!pointerDown) return;
      pointerDrill = true;
      refreshHolding();
    },
    touch ? HOLD_MS_TOUCH : HOLD_MS
  );

  refreshHolding();
  kick();
}

function onPointerUp(e) {
  if (!e.isPrimary || !pointerDown) return;
  clearTimeout(holdTimer);
  holdTimer = 0;
  // If we drilled, cancel the click that comes right after.
  if (pointerDrill && e.type === 'pointerup') {
    suppressUntil = performance.now() + CLICK_BLOCK_MS;
  }
  pointerDown = false;
  pointerDrill = false;
  refreshHolding();
}

function onClickCapture(e) {
  if (performance.now() < suppressUntil) {
    suppressUntil = 0;
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

function onKeyDown(e) {
  if (auto || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key !== 'd' && e.key !== 'D') return;
  if (isTextField(e.target)) return;
  keyDrill = true;
  touchPress = false;
  refreshHolding();
}

function onKeyUp(e) {
  if (e.key !== 'd' && e.key !== 'D') return;
  keyDrill = false;
  refreshHolding();
}

function onScroll() {
  if (openState) kick(); // the page moved under the lens: refresh the HUD
}

function onVisibility() {
  if (document.hidden) {
    releaseAll(); // let go of any hold
    cancelAnimationFrame(rafId);
    rafId = 0;
  } else {
    kick();
  }
}

/* ---------- public API ---------- */

export function startLens() {
  if (started) return;
  root = document.getElementById('deep');
  if (!root) return;

  rings = [...root.querySelectorAll('.deep-ring')];
  abort = new AbortController();
  const o = { signal: abort.signal };

  pos.x = goal.x = window.innerWidth / 2;
  pos.y = goal.y = window.innerHeight / 2;
  seenPointer = false;
  peelN = 0;
  peelTarget = 0;
  peelK = 0;
  started = true;

  window.addEventListener('pointermove', onPointerMove, { ...o, passive: true });
  window.addEventListener('pointerdown', onPointerDown, { ...o, passive: true });
  window.addEventListener('pointerup', onPointerUp, o);
  window.addEventListener('pointercancel', onPointerUp, o);
  window.addEventListener('click', onClickCapture, { ...o, capture: true });
  window.addEventListener('keydown', onKeyDown, o);
  window.addEventListener('keyup', onKeyUp, o);
  window.addEventListener('blur', releaseAll, o);
  window.addEventListener('scroll', onScroll, { ...o, passive: true });
  window.addEventListener('resize', kick, { ...o, passive: true });
  document.addEventListener('visibilitychange', onVisibility, o);
  document.documentElement.addEventListener(
    'mouseleave',
    () => {
      root.dataset.cursor = 'off';
    },
    o
  );

  // While drilling: no text selection, no dragging, no long-press menu.
  document.addEventListener('selectstart', (e) => holding && e.preventDefault(), o);
  document.addEventListener('dragstart', (e) => holding && e.preventDefault(), o);
  document.addEventListener(
    'contextmenu',
    (e) => (holding || pointerDown) && e.pointerType !== 'mouse' && e.preventDefault(),
    o
  );

  document.documentElement.classList.add('deep-on');
  render();
  notify();
}

export function stopLens() {
  if (!started) return;
  abort.abort();
  cancelAnimationFrame(rafId);
  rafId = 0;
  releaseAll();
  blockTouchScroll(false);
  depth = 0;
  vel = 0;
  depthTarget = 0;
  peelN = 0;
  peelTarget = 0;
  peelK = 0;
  auto = false;
  started = false;
  openState = false;
  peeledState = false;
  ringOpen.fill(false);
  rings.forEach((r) => r.classList.remove('is-open'));
  ['--r1', '--r2', '--r3', '--r4'].forEach((v) => root.style.setProperty(v, '0px'));
  root.classList.remove('is-open', 'is-pressing', 'is-auto', 'is-peeled');
  document.documentElement.classList.remove('deep-on', 'is-drilling');
}

// Where the lens should go (viewport pixels). It eases there.
export function moveTo(x, y) {
  goal.x = x;
  goal.y = y;
  if (!seenPointer) {
    pos.x = x;
    pos.y = y;
    seenPointer = true;
  }
  kick();
}

// Where depth springs to when the user is not holding. 0 to 4.
export function setDepthTarget(d) {
  depthTarget = clamp(Number(d) || 0, 0, MAX_DEPTH);
  kick();
}

// true = the lens ignores the pointer and the D key (for the intro, the Layers panel, Human).
export function setAuto(on) {
  auto = !!on;
  if (auto) releaseAll();
  root?.classList.toggle('is-auto', auto);
  kick();
}

// Depth 0 to 4. While a layer is peeled, this is that layer number.
export function getDepth() {
  return effectiveDepth();
}

// true while the user is drilling (hold passed 200ms mouse / 250ms touch, or D key down).
export function isHolding() {
  return holding;
}

// fn(depth, { x, y, holding, layer }) runs on every frame the lens loop runs.
// Returns a function that removes the listener.
export function onDepth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Step 7. Show ONE layer (1 to 4) on the whole screen. 0 = back to normal.
export function setPeel(n) {
  const v = clamp(Math.round(Number(n) || 0), 0, 4);
  if (v) {
    peelN = v;
    peelTarget = 1;
  } else {
    peelTarget = 0;
  }
  kick();
}

// The peeled layer (1 to 4), or 0. It stays set while the peel is closing.
export function getPeel() {
  return peelN;
}