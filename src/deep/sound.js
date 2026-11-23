// A tiny hum made with WebAudio oscillators. No audio files. OFF by default.
// The hum rises with lens depth. human.js sends the event below when layer 5 is open.
// Exports: startSound, stopSound

import { onDepth } from './lens.js';

const HUMAN_EVENT = 'underneath:human';
const BASE_HZ = 98;
const HUMAN_HZ = 130.8;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/>' +
  '<g class="sound-toggle__waves"><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 7.5a6.5 6.5 0 0 1 0 9"/></g>' +
  '<path class="sound-toggle__off" d="M16 9.5l5 5M21 9.5l-5 5"/>' +
  '</svg>';

let started = false;
let btn = null;
let ctx = null;
let nodes = null;
let on = false;
let abort = null;
let unsubDepth = null;
let offTimer = 0;
let blipTimer = 0;
let humanOpen = false;
let lastDepth = 0;
let appliedDepth = -1;
let texts = { label: 'Depth hum', on: 'Sound is on.', off: 'Sound is off.' };

// Made the first time the person turns sound on (browsers need a click first).
function ensureAudio() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC();
  } catch (err) {
    ctx = null;
    return false;
  }

  const master = ctx.createGain();
  master.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.7;

  const a = ctx.createOscillator();
  a.type = 'sine';
  const b = ctx.createOscillator();
  b.type = 'triangle';
  const c = ctx.createOscillator();
  c.type = 'sine';
  const gb = ctx.createGain();
  gb.gain.value = 0.5;
  const gc = ctx.createGain();
  gc.gain.value = 0.25;

  a.connect(filter);
  b.connect(gb);
  gb.connect(filter);
  c.connect(gc);
  gc.connect(filter);
  filter.connect(master);
  master.connect(ctx.destination);

  a.frequency.value = BASE_HZ;
  b.frequency.value = BASE_HZ * 1.004;
  c.frequency.value = BASE_HZ * 2;
  a.start();
  b.start();
  c.start();

  nodes = { master, filter, a, b, c };
  return true;
}

// Moves the hum toward the right pitch, brightness and loudness for this depth.
function apply(depth) {
  if (!ctx || !nodes) return;
  appliedDepth = depth;
  const t = ctx.currentTime;
  let base;
  let cutoff;
  let level;

  if (humanOpen) {
    base = HUMAN_HZ; // calm and steady in layer 5
    cutoff = 520;
    level = 0.035;
  } else {
    const d = clamp(depth / 4, 0, 1);
    base = BASE_HZ * Math.pow(2, d * 1.25);
    cutoff = 260 + d * 1500;
    level = depth < 0.02 ? 0 : 0.012 + d * 0.045;
  }
  if (!on) level = 0;

  nodes.master.gain.setTargetAtTime(level, t, 0.12);
  nodes.a.frequency.setTargetAtTime(base, t, 0.08);
  nodes.b.frequency.setTargetAtTime(base * 1.004, t, 0.08);
  nodes.c.frequency.setTargetAtTime(base * 2, t, 0.08);
  nodes.filter.frequency.setTargetAtTime(cutoff, t, 0.1);
}

function paintButton() {
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(on));
  btn.title = on ? texts.on : texts.off;
  btn.classList.toggle('is-on', on);
}

function setOn(next) {
  if (next && !ensureAudio()) return;
  on = next;
  clearTimeout(offTimer);
  clearTimeout(blipTimer);

  if (on) {
    ctx.resume?.();
    apply(lastDepth);
    // A short soft swell, so you can hear that it is on even at depth 0.
    const t = ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(t);
    nodes.master.gain.setTargetAtTime(0.03, t, 0.05);
    blipTimer = window.setTimeout(() => apply(lastDepth), 450);
  } else {
    apply(lastDepth);
    offTimer = window.setTimeout(() => {
      if (!on) ctx?.suspend?.();
    }, 700);
  }
  paintButton();
}

export function stopSound() {
  if (!started) return;
  started = false;
  abort?.abort();
  abort = null;
  unsubDepth?.();
  unsubDepth = null;
  clearTimeout(offTimer);
  clearTimeout(blipTimer);
  btn?.remove();
  btn = null;
  try {
    ctx?.close();
  } catch (err) {
    /* already closed */
  }
  ctx = null;
  nodes = null;
  on = false;
  humanOpen = false;
}

export function startSound(options = {}) {
  if (started) return stopSound;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return () => {}; // no WebAudio: no button

  started = true;
  texts = { ...texts, ...options };

  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  btn.setAttribute('aria-label', texts.label);
  btn.innerHTML = ICON; // fixed icon text written above, nothing from the user
  document.body.append(btn);

  abort = new AbortController();
  const o = { signal: abort.signal };

  btn.addEventListener('click', () => setOn(!on), o);

  window.addEventListener(
    HUMAN_EVENT,
    (e) => {
      humanOpen = !!(e.detail && e.detail.open);
      apply(lastDepth);
    },
    o
  );

  document.addEventListener(
    'visibilitychange',
    () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend?.();
      else if (on) ctx.resume?.();
    },
    o
  );

  unsubDepth = onDepth((depth) => {
    lastDepth = depth;
    if (!on) return;
    if (depth < 0.02 || Math.abs(depth - appliedDepth) > 0.005) apply(depth);
  });

  paintButton();
  return stopSound;
}