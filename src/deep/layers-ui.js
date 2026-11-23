// The "Layers" button, its panel, keys 0 to 5, the live region (step 7).
// Not a dialog: no focus trap, Esc closes. #deep stays aria-hidden and inert.
// Keys: 1 to 4 = peel that layer over the whole page, 5 = Human, 0 or Esc = back to the Surface.
// Panel: Depth slider (opens the lens at the center of the screen), 5 layer buttons,
// "Peel the whole page" switch, "Back to the surface".
// Exports: startLayersUi, stopLayersUi

import { setAuto, setDepthTarget, setPeel, moveTo } from './lens.js';
import { openHuman, closeHuman, isHumanOpen } from './human.js';

const EVENT_HUMAN = 'underneath:human';
const NAMES = ['Surface', 'Blueprint', 'Source', 'Memory', 'Silicon', 'Human'];
const KEY_NO_TYPING =
  'textarea, select, [contenteditable="true"], input:not([type="range"]):not([type="checkbox"])';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/></svg>';

let started = false;
let abort = null;
let wrap = null;
let fab = null;
let fabNow = null;
let panel = null;
let slider = null;
let out = null;
let peelBox = null;
let status = null;
let live = null;
let btns = [];

let layer = 0; // 0 Surface, 1 to 4 deep layers, 5 Human
let mode = 'surface'; // surface, lens, peel, human
let lastSaid = -1;
let sayTimer = 0;

function make(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

/* ---------- announcements and painting ---------- */

function message(n) {
  if (n === 0) return 'Layer: Surface. The real page.';
  if (n === 5) return 'Layer: Human. Contact links and what this page can see about you.';
  return `Layer: ${NAMES[n]}. Decorative view.`;
}

function say(n) {
  if (!live || n === lastSaid) return;
  lastSaid = n;
  clearTimeout(sayTimer);
  live.textContent = '';
  sayTimer = window.setTimeout(() => {
    live.textContent = message(n);
  }, 60);
}

function setSlider(v) {
  if (!slider) return;
  slider.value = String(v);
  out.textContent = Number(v).toFixed(1);
  slider.setAttribute('aria-valuetext', `${Number(v).toFixed(1)} of 4`);
}

function paint() {
  fab.classList.toggle('is-active', layer > 0);
  fabNow.hidden = layer === 0;
  fabNow.textContent = NAMES[layer];
  btns.forEach((b, i) => b.setAttribute('aria-pressed', String(layer === i + 1)));
  if (layer === 0) status.textContent = 'Showing: the Surface (the real page).';
  else if (layer === 5) status.textContent = 'Showing: Human (real contact links).';
  else status.textContent = `Showing: ${NAMES[layer]} (decorative view).`;
}

/* ---------- the four ways to change layer ---------- */

function goSurface() {
  if (isHumanOpen()) closeHuman();
  setPeel(0);
  setDepthTarget(0);
  setAuto(false);
  mode = 'surface';
  layer = 0;
  setSlider(0);
  paint();
  say(0);
}

function goPeel(n) {
  if (isHumanOpen()) closeHuman();
  setAuto(true);
  setDepthTarget(0);
  setPeel(n);
  mode = 'peel';
  layer = n;
  setSlider(n);
  paint();
  say(n);
}

function goLens(d) {
  if (isHumanOpen()) closeHuman();
  setPeel(0);
  setAuto(true);
  moveTo(window.innerWidth / 2, window.innerHeight / 2);
  setDepthTarget(d);
  mode = 'lens';
  layer = clamp(Math.ceil(d - 1e-6), 1, 4);
  paint();
  say(layer);
}

function goHuman() {
  if (isHumanOpen()) return;
  setPeel(0);
  setDepthTarget(0);
  openHuman(window.innerWidth / 2, window.innerHeight / 2); // the event below updates the state
}

/* ---------- panel ---------- */

function setPanel(open, focusFab) {
  panel.hidden = !open;
  fab.setAttribute('aria-expanded', String(open));
  if (!open && focusFab) fab.focus();
}

function onSlider() {
  const d = Number(slider.value);
  out.textContent = d.toFixed(1);
  slider.setAttribute('aria-valuetext', `${d.toFixed(1)} of 4`);
  if (d < 0.05) {
    goSurface();
    return;
  }
  if (peelBox.checked) goPeel(clamp(Math.round(d), 1, 4));
  else goLens(d);
}

function onLayerButton(n) {
  if (n === 5) {
    goHuman();
    return;
  }
  if (peelBox.checked) goPeel(n);
  else {
    setSlider(n);
    goLens(n);
  }
}

function buildUi() {
  wrap = make('div', 'layers');
  wrap.setAttribute('data-no-lens', '');

  fab = make('button', 'layers__fab');
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'layers-panel');
  const icon = make('span', 'layers__icon');
  icon.innerHTML = ICON; // fixed icon text written above, nothing from the user
  fabNow = make('span', 'layers__now');
  fabNow.hidden = true;
  fab.append(icon, make('span', 'layers__fab-text', 'Layers'), fabNow);

  panel = make('div', 'layers__panel');
  panel.id = 'layers-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-labelledby', 'layers-title');
  panel.hidden = true;

  const title = make('p', 'layers__title', 'Layers');
  title.id = 'layers-title';

  const depthRow = make('label', 'layers__label');
  depthRow.htmlFor = 'layers-depth';
  out = make('output', 'layers__out', '0.0');
  out.id = 'layers-depth-out';
  out.htmlFor = 'layers-depth';
  depthRow.append(make('span', '', 'Depth'), out);

  slider = make('input', 'layers__range');
  slider.id = 'layers-depth';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '4';
  slider.step = '0.1';
  slider.value = '0';
  slider.setAttribute('aria-valuetext', '0.0 of 4');

  const peelRow = make('label', 'layers__check');
  peelBox = make('input');
  peelBox.type = 'checkbox';
  peelBox.id = 'layers-peel';
  peelRow.append(peelBox, make('span', '', 'Peel the whole page'));

  const list = make('ul', 'layers__list');
  btns = [];
  for (let n = 1; n <= 5; n++) {
    const li = make('li');
    const b = make('button', 'layers__btn');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.append(make('span', '', NAMES[n]), make('kbd', 'layers__key', String(n)));
    b.addEventListener('click', () => onLayerButton(n), { signal: abort.signal });
    btns.push(b);
    li.append(b);
    list.append(li);
  }

  const back = make('button', 'layers__btn layers__back');
  back.type = 'button';
  back.append(make('span', '', 'Back to the surface'), make('kbd', 'layers__key', '0'));
  back.addEventListener('click', goSurface, { signal: abort.signal });

  status = make('p', 'layers__status', '');
  const hint = make('p', 'layers__hint', 'Keys 1 to 5 show a layer. 0 or Esc goes back.');

  panel.append(title, depthRow, slider, peelRow, list, back, status, hint);
  wrap.append(panel, fab);
  document.body.append(wrap);

  live = make('div', 'layers__live');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.append(live);
}

/* ---------- keyboard ---------- */

function onKey(e) {
  if (!started || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  if (isHumanOpen()) return; // Human has its own Esc
  const t = e.target;
  if (t instanceof Element && t.closest(KEY_NO_TYPING)) return;

  if (e.key === 'Escape') {
    if (mode !== 'surface') {
      e.preventDefault();
      goSurface();
    } else if (!panel.hidden) {
      e.preventDefault();
      setPanel(false, true);
    }
    return;
  }
  if (e.repeat || e.key.length !== 1) return;

  if (e.key === '0') {
    goSurface();
  } else if (e.key >= '1' && e.key <= '4') {
    peelBox.checked = true;
    goPeel(Number(e.key));
  } else if (e.key === '5') {
    goHuman();
  }
}

function onHuman(e) {
  const open = !!(e.detail && e.detail.open);
  if (open) {
    mode = 'human';
    layer = 5;
    setSlider(0);
  } else if (mode === 'human') {
    mode = 'surface';
    layer = 0;
    say(0);
  }
  paint();
}

/* ---------- public API ---------- */

export function stopLayersUi() {
  if (!started) return;
  started = false;
  abort?.abort();
  abort = null;
  clearTimeout(sayTimer);
  wrap?.remove();
  live?.remove();
  wrap = null;
  live = null;
}

export function startLayersUi() {
  if (started) return stopLayersUi;
  started = true;
  abort = new AbortController();
  const o = { signal: abort.signal };

  buildUi();
  paint();

  fab.addEventListener('click', () => setPanel(panel.hidden, false), o);
  slider.addEventListener('input', onSlider, o);
  peelBox.addEventListener(
    'change',
    () => {
      if (layer >= 1 && layer <= 4) onSlider();
    },
    o
  );
  window.addEventListener('keydown', onKey, o);
  window.addEventListener(EVENT_HUMAN, onHuman, o);

  return stopLayersUi;
}