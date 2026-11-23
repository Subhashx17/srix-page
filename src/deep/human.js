// The secret 5th layer: HUMAN (step 6, changed in step 7).
// Hold at full depth (4.0) for 1.4 seconds: a ring charges, the lens swells over the whole
// screen, and a calm dark page says who is underneath. Esc or the button goes back.
// Step 7: also opened by key 5 / the Layers panel (openHuman). No Tab trap any more: everything
// behind the dialog is inert, and Esc always works.
// This is a real dialog (#human, made by JS, outside #deep), so it is not aria-hidden
// while it is open. The Surface has the same contact info as plain text.
// Exports: startHuman, stopHuman, openHuman, closeHuman, isHumanOpen

import { onDepth, isHolding, getDepth, setAuto, setDepthTarget, setPeel } from './lens.js';

const CHARGE_MS = 1400; // hold time at full depth
const DRAIN_MS = 350; // how fast the ring empties if you let go
const FULL_DEPTH = 3.98;
const START_R = 50; // same as the layer 4 circle
const SWELL_MS = 900;
const LEAVE_MS = 260;
const RING_R = 60;
const STEP_DELAYS = [450, 1900, 3700, 5300]; // when each part appears after the swell
const EVENT_NAME = 'underneath:human'; // sound.js and layers-ui.js listen to this

// The exact code that runs on the visitor's device. It is also shown on screen.
const DEVICE_CODE = [
  'function readDevice() {',
  '  const n = navigator;',
  '  const ua = n.userAgentData;',
  '  return {',
  "    'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone,",
  "    'Language': n.language,",
  "    'Screen': screen.width + ' x ' + screen.height + ' px',",
  "    'CPU cores': n.hardwareConcurrency,",
  "    'OS and browser': ua && ua.brands",
  "      ? ua.platform + ' / ' + ua.brands.map(b => b.brand + ' ' + b.version).join(', ')",
  '      : n.userAgent',
  '  };',
  '}',
].join('\n');

const CIRC = 2 * Math.PI * RING_R;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let started = false;
let abort = null;
let unsubDepth = null;
let T = null; // content.human

let el = null;
let backBtn = null;
let codeBtn = null;
let codeBox = null;
let factsEl = null;
let ring = null;
let ringFill = null;

let opened = false;
let openToken = 0;
let swellAnim = null;
let leaveAnim = null;
let timers = [];
let inerted = [];
let lastFocus = null;

let charge = 0;
let chargeRaf = 0;
let chargeLast = 0;
let lensX = 0;
let lensY = 0;

/* ---------- small helpers ---------- */

function make(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function announce(isOpen) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { open: isOpen } }));
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/* ---------- build the page (once, hidden) ---------- */

function buildOverlay(content) {
  const root = make('section', 'human');
  root.id = 'human';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'human-label');
  root.tabIndex = -1;
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');

  const top = make('div', 'human__top');
  const label = make('p', 'human__label', T.label);
  label.id = 'human-label';
  backBtn = make('button', 'human__back');
  backBtn.type = 'button';
  const esc = make('span', 'human__esc', 'Esc');
  esc.setAttribute('aria-hidden', 'true');
  backBtn.append(document.createTextNode(T.back), esc);
  top.append(label, backBtn);

  const stage = make('div', 'human__stage');

  // 1
  const line1 = make('p', 'human__line human__step', T.lines[0]);

  // 2: "That is me." and the contact buttons
  const me = make('div', 'human__step human__me');
  const meLine = make('p', 'human__line', T.lines[1]);
  const dot = make('span', 'human__dot');
  dot.setAttribute('aria-hidden', 'true');
  meLine.append(dot);
  const links = make('ul', 'human__links');
  for (const l of content.contact?.links || []) {
    const li = make('li');
    const a = make('a', 'human__btn', l.label);
    a.href = l.href;
    if (/^https?:/i.test(l.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    li.append(a);
    links.append(li);
  }
  me.append(meLine, links);

  // 3
  const line3 = make('p', 'human__line human__step', T.lines[2]);

  // 4: what this page can see about you
  const panel = make('section', 'human__panel human__step');
  panel.setAttribute('aria-labelledby', 'human-panel-title');
  const title = make('h2', 'human__panel-title', T.panelTitle);
  title.id = 'human-panel-title';
  factsEl = make('dl', 'human__facts');
  const privacy = make('p', 'human__privacy', T.privacy);
  codeBtn = make('button', 'human__toggle', T.showCode);
  codeBtn.type = 'button';
  codeBtn.setAttribute('aria-expanded', 'false');
  codeBtn.setAttribute('aria-controls', 'human-code');
  codeBox = make('pre', 'human__code');
  codeBox.id = 'human-code';
  codeBox.hidden = true;
  codeBox.append(make('code', '', DEVICE_CODE));
  panel.append(title, factsEl, privacy, codeBtn, codeBox);

  stage.append(line1, me, line3, panel);
  root.append(top, stage);
  document.body.append(root);
  return root;
}

function buildRing() {
  const deep = document.getElementById('deep');
  if (!deep) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'human-charge');
  svg.setAttribute('viewBox', '-70 -70 140 140');
  svg.setAttribute('aria-hidden', 'true');

  const track = document.createElementNS(NS, 'circle');
  track.setAttribute('class', 'human-charge__track');
  track.setAttribute('r', String(RING_R));

  ringFill = document.createElementNS(NS, 'circle');
  ringFill.setAttribute('class', 'human-charge__fill');
  ringFill.setAttribute('r', String(RING_R));
  ringFill.setAttribute('transform', 'rotate(-90)'); // start at the top
  ringFill.style.strokeDasharray = String(CIRC);
  ringFill.style.strokeDashoffset = String(CIRC);

  svg.append(track, ringFill);
  deep.append(svg);
  ring = svg;
}

/* ---------- what the page can see (read live on THIS device) ---------- */

function readFacts() {
  try {
    // Runs the same text that "Show the code" displays.
    const read = new Function('return (' + DEVICE_CODE + ')')();
    return read();
  } catch (err) {
    return null;
  }
}

function fillFacts() {
  const data = readFacts();
  factsEl.textContent = '';
  const entries = data ? Object.entries(data) : [['Device', 'not available here']];
  for (const [k, v] of entries) {
    const row = make('div', 'human__fact');
    row.append(make('dt', '', k), make('dd', '', v == null || v === '' ? 'unknown' : String(v)));
    factsEl.append(row);
  }
}

function setCode(show) {
  codeBox.hidden = !show;
  codeBtn.setAttribute('aria-expanded', String(show));
  codeBtn.textContent = show ? T.hideCode : T.showCode;
}

/* ---------- the charge ring ---------- */

function paintRing() {
  if (!ring) return;
  ringFill.style.strokeDashoffset = String(CIRC * (1 - charge));
  ring.style.opacity = charge > 0.001 ? String(Math.min(1, 0.4 + charge)) : '0';
}

function wantsCharge() {
  return !opened && isHolding() && getDepth() >= FULL_DEPTH;
}

function chargeTick(now) {
  chargeRaf = 0;
  if (document.hidden) {
    chargeLast = 0;
    return;
  }
  const dt = chargeLast ? Math.min(now - chargeLast, 50) : 16;
  chargeLast = now;

  if (wantsCharge()) charge += dt / CHARGE_MS;
  else charge -= dt / DRAIN_MS;
  charge = clamp(charge, 0, 1);
  paintRing();

  if (charge >= 1) {
    chargeLast = 0;
    open();
    return;
  }
  if (charge > 0 || wantsCharge()) {
    chargeRaf = requestAnimationFrame(chargeTick);
  } else {
    chargeLast = 0;
  }
}

/* ---------- open and close ---------- */

function swell(x, y) {
  if (reducedMotion() || !el.animate) return Promise.resolve();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const end = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y))) + 8;
  const a = `circle(${START_R}px at ${x}px ${y}px)`;
  const b = `circle(${end}px at ${x}px ${y}px)`;
  swellAnim = el.animate(
    { clipPath: [a, b] },
    { duration: SWELL_MS, easing: 'cubic-bezier(0.65, 0, 0.25, 1)' }
  );
  return swellAnim.finished.catch(() => {});
}

function showSteps() {
  clearTimers();
  const steps = [...el.querySelectorAll('.human__step')];
  if (reducedMotion()) {
    steps.forEach((s) => s.classList.add('is-shown'));
    return;
  }
  steps.forEach((s, i) => {
    timers.push(window.setTimeout(() => s.classList.add('is-shown'), STEP_DELAYS[i] ?? 0));
  });
}

// Everything behind the dialog becomes inert (no focus, no clicks, hidden from screen readers).
function lockPage() {
  inerted = [];
  for (const child of document.body.children) {
    if (child === el || child.id === 'deep') continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
    if (child.inert) continue;
    child.inert = true;
    inerted.push(child);
  }
}

function unlockPage() {
  inerted.forEach((n) => {
    n.inert = false;
  });
  inerted = [];
}

function open() {
  if (!started || opened) return;
  opened = true;
  const token = ++openToken;
  charge = 0;
  paintRing();

  leaveAnim?.cancel();
  leaveAnim = null;

  lastFocus = document.activeElement;
  fillFacts();
  setCode(false);

  // The lens hands control to this layer: it lets go and closes under the dark page.
  setPeel(0);
  setAuto(true);
  setDepthTarget(0);

  el.hidden = false;
  el.removeAttribute('aria-hidden');
  document.documentElement.classList.add('human-on');
  lockPage();
  el.focus({ preventScroll: true });
  announce(true);

  swell(lensX, lensY).then(() => {
    if (token !== openToken || !opened) return;
    swellAnim = null;
    showSteps();
  });
}

function hideNow() {
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  el.querySelectorAll('.is-shown').forEach((n) => n.classList.remove('is-shown'));
  setCode(false);
  document.documentElement.classList.remove('human-on');
}

function close() {
  if (!opened) return;
  opened = false;
  openToken++;
  clearTimers();
  swellAnim?.cancel();
  swellAnim = null;

  unlockPage();
  setAuto(false);
  announce(false);

  const back = lastFocus && document.contains(lastFocus) ? lastFocus : null;
  lastFocus = null;
  if (back && typeof back.focus === 'function') back.focus({ preventScroll: true });

  if (reducedMotion() || !el.animate) {
    hideNow();
    return;
  }
  const out = el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: LEAVE_MS,
    easing: 'ease-out',
    fill: 'forwards',
  });
  leaveAnim = out;
  out.finished.then(
    () => {
      if (opened || leaveAnim !== out) return;
      hideNow();
      out.cancel();
      leaveAnim = null;
    },
    () => {}
  );
}

/* ---------- keyboard: Esc only (no focus trap, the page behind is inert) ---------- */

function onKeyDown(e) {
  if (!opened) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
}

/* ---------- public API ---------- */

export function stopHuman() {
  if (!started) return;
  if (opened) close();
  started = false;
  abort?.abort();
  abort = null;
  unsubDepth?.();
  unsubDepth = null;
  cancelAnimationFrame(chargeRaf);
  chargeRaf = 0;
  clearTimers();
  el?.remove();
  ring?.remove();
  el = null;
  ring = null;
  ringFill = null;
}

export function startHuman(content) {
  if (started) return stopHuman;
  if (!content || !content.human) return () => {};
  started = true;
  T = content.human;

  el = buildOverlay(content);
  buildRing();

  abort = new AbortController();
  const o = { signal: abort.signal };
  backBtn.addEventListener('click', close, o);
  codeBtn.addEventListener('click', () => setCode(codeBox.hidden), o);
  document.addEventListener('keydown', onKeyDown, o);

  // The lens loop stops once depth reaches 4, so this wakes our own small loop.
  unsubDepth = onDepth((depth, info) => {
    lensX = info.x;
    lensY = info.y;
    if (!opened && !chargeRaf && info.holding && depth >= FULL_DEPTH) {
      chargeLast = 0;
      chargeRaf = requestAnimationFrame(chargeTick);
    }
  });

  return stopHuman;
}

// Step 7: open it from code (key 5, the Layers panel). x and y = where the circle swells from.
export function openHuman(x, y) {
  if (!started || opened) return;
  lensX = Number.isFinite(x) ? x : window.innerWidth / 2;
  lensY = Number.isFinite(y) ? y : window.innerHeight / 2;
  open();
}

export function closeHuman() {
  if (started) close();
}

export function isHumanOpen() {
  return opened;
}