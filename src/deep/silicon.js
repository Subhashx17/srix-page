// Layer 4: SILICON.
// One <canvas> per slab. Normally it is only a small window around the lens (cheap).
// When layer 4 is peeled over the whole screen, the window covers the part of the block that is
// on screen. A big heading is drawn on a tiny offscreen canvas and used as a mask: inside the mask
// bright cyan 0 and 1, outside very faint ones. The bits are the REAL bytes of the block
// (text, then outerHTML). Glyphs come from a small pre-drawn atlas, so drawing is cheap.
// The loop runs only while depth is above 3.2 and stops completely otherwise.
// Streaming is OFF when navigator.connection.saveData is true, when cores <= 4,
// and with prefers-reduced-motion (the bits are then drawn once and do not move).
// Exports: silicon (also default) = { build, onResize }

import { onDepth, getDepth, getPeel } from './lens.js';

const ENC = new TextEncoder();
const LOW_END = (navigator.hardwareConcurrency ?? 8) <= 4; // weak computer: bigger cells
const CELL = LOW_END ? 10 : 8; // grid size in px
const FRAME_MS = LOW_END ? 1000 / 30 : 0;
const MAX_R = 50; // max radius of layer 4 (same as lens.js)
const HALF = Math.ceil((MAX_R + CELL * 2) / CELL) * CELL; // half size of the lens window
const N = (HALF * 2) / CELL; // cells per side in the lens window
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const ANIMATE_ABOVE = 3.2;
const TICK_MS = 220; // the bits move one step this often
const TICK_PEEL_MS = 440; // slower when the whole screen is drawn
const PEEL_CELLS_MAX = 36000; // about a full 1080p screen
const MASK_SCALE = 2; // mask is sampled 2x2 per cell
const MAX_BYTES = 8192;

const BRIGHT = '#7FE3B8';
const FAINT = 'rgba(127, 227, 184, 0.14)';
const FONT_FAMILY = '"JetBrains Mono Variable", ui-monospace, Consolas, monospace';
const MASK_FONT = '"Inter Variable", Inter, system-ui, sans-serif';

const states = new Set();
const lens = { x: -9999, y: -9999 };
const calmQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const noStream = () =>
  LOW_END || navigator.connection?.saveData === true || !!calmQuery?.matches;
let unhook = null;
let raf = 0;
let lastFrame = 0;
let atlas = null;

/* ---------- glyph atlas: faint 0, faint 1, bright 0, bright 1 ---------- */

function getAtlas() {
  if (atlas) return atlas;
  const px = Math.max(1, Math.round(CELL * DPR));
  const cv = document.createElement('canvas');
  cv.width = px * 4;
  cv.height = px;
  const g = cv.getContext('2d');
  g.font = `500 ${CELL * DPR}px ${FONT_FAMILY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = ['0', '1', '0', '1'];
  const fills = [FAINT, FAINT, BRIGHT, BRIGHT];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = fills[i];
    g.fillText(chars[i], px * i + px / 2, px / 2);
  }
  atlas = { cv, px };
  return atlas;
}

// When the real font arrives, draw the atlas again.
document.fonts?.ready.then(() => {
  atlas = null;
  for (const st of states) st.key = '';
});

/* ---------- data: heading text, bytes, mask ---------- */

const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();

function headingText(block) {
  const h = block.querySelector('h1, h2, h3, h4, h5, h6');
  let t = squash(h?.textContent);
  if (!t) t = squash(block.innerText);
  if (!h || t.length > 24) t = t.split(' ').filter(Boolean).slice(0, 2).join(' '); // first 2 words
  return t || block.dataset.block || '01';
}

function collectBytes(block) {
  const text = ENC.encode(block.innerText || '');
  const html = ENC.encode(block.outerHTML).subarray(0, MAX_BYTES);
  const all = new Uint8Array(text.length + html.length);
  all.set(text, 0);
  all.set(html, text.length);
  return all.length ? all : ENC.encode(block.dataset.block || '01');
}

// mask[cell] = 1 when the heading covers this grid cell. Tiny canvas: one pixel group per cell.
function makeMask(text, gc, gr, w, h) {
  const mask = new Uint8Array(gc * gr);
  const S = MASK_SCALE;
  const cv = document.createElement('canvas');
  cv.width = gc * S;
  cv.height = gr * S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return mask;

  ctx.scale(S / CELL, S / CELL); // from css px to mask px
  ctx.font = `900 100px ${MASK_FONT}`;
  const m = Math.max(1, ctx.measureText(text).width);
  const fs = Math.max(10, Math.min(h * 0.8, (w * 0.92 * 100) / m)); // as big as the slab allows
  ctx.font = `900 ${fs}px ${MASK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(text, w / 2, h / 2 + fs * 0.04);

  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const limit = 0.35 * 255 * S * S;
  for (let r = 0; r < gr; r++) {
    for (let c = 0; c < gc; c++) {
      let a = 0;
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          a += data[((r * S + j) * cv.width + (c * S + i)) * 4 + 3];
        }
      }
      if (a > limit) mask[r * gc + c] = 1;
    }
  }
  return mask;
}

/* ---------- drawing ---------- */

function draw(st, tick, peel) {
  const rect = st.slab.getBoundingClientRect();
  let c0;
  let r0;
  let nc;
  let nr;

  if (peel) {
    // the part of the block that is on screen
    c0 = Math.max(0, Math.floor(-rect.left / CELL));
    r0 = Math.max(0, Math.floor(-rect.top / CELL));
    const c1 = Math.min(st.gc, Math.ceil((window.innerWidth - rect.left) / CELL));
    const r1 = Math.min(st.gr, Math.ceil((window.innerHeight - rect.top) / CELL));
    nc = c1 - c0;
    nr = r1 - r0;
    if (nc <= 0 || nr <= 0) return;
    if (nc * nr > PEEL_CELLS_MAX) nr = Math.max(1, Math.floor(PEEL_CELLS_MAX / nc));
  } else {
    // a small window that follows the lens
    c0 = Math.floor((lens.x - rect.left - HALF) / CELL);
    r0 = Math.floor((lens.y - rect.top - HALF) / CELL);
    nc = N;
    nr = N;
  }

  const key = `${c0},${r0},${nc},${nr},${tick}`;
  if (key === st.key) return; // nothing changed
  st.key = key;

  const cv = st.canvas;
  if (nc !== st.nc || nr !== st.nr) {
    st.nc = nc;
    st.nr = nr;
    cv.width = Math.round(nc * CELL * DPR);
    cv.height = Math.round(nr * CELL * DPR);
    cv.style.width = `${nc * CELL}px`;
    cv.style.height = `${nr * CELL}px`;
  }
  if (c0 !== st.c0 || r0 !== st.r0) {
    st.c0 = c0;
    st.r0 = r0;
    cv.style.transform = `translate3d(${c0 * CELL}px, ${r0 * CELL}px, 0)`;
  }

  const ctx = st.ctx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, nc * CELL, nr * CELL);

  const a = getAtlas();
  const { gc, gr, mask, bytes } = st;
  const total = bytes.length * 8;
  for (let j = 0; j < nr; j++) {
    const row = r0 + j;
    if (row < 0 || row >= gr) continue;
    const speed = 1 + ((Math.imul(row + 1, 0x9e3779b1) >>> 28) & 1); // 1 or 2 cells per tick
    const shift = tick * speed;
    for (let i = 0; i < nc; i++) {
      const col = c0 + i;
      if (col < 0 || col >= gc) continue;
      const cell = row * gc + col;
      const idx = (cell + shift) % total;
      const bit = (bytes[idx >> 3] >> (7 - (idx & 7))) & 1;
      ctx.drawImage(a.cv, a.px * (mask[cell] * 2 + bit), 0, a.px, a.px, i * CELL, j * CELL, CELL, CELL);
    }
  }
}

/* ---------- the loop: runs only while depth > 3.2 ---------- */

function frame(now) {
  raf = 0;
  if (document.hidden || getDepth() <= ANIMATE_ABOVE) return; // stop completely
  raf = requestAnimationFrame(frame);
  if (now - lastFrame < FRAME_MS - 1) return; // 30 fps on weak computers
  lastFrame = now;

  const peel = getPeel() === 4;
  const tick = noStream() ? 0 : Math.floor(now / (peel ? TICK_PEEL_MS : TICK_MS));
  for (const st of states) {
    if (!st.slab.isConnected) {
      states.delete(st);
      continue;
    }
    if (!st.slab.classList.contains('is-near')) continue;
    draw(st, tick, peel);
  }
}

function ensureHook() {
  if (unhook) return;
  unhook = onDepth((depth, info) => {
    lens.x = info.x;
    lens.y = info.y;
    if (depth > ANIMATE_ABOVE && !raf && !document.hidden) raf = requestAnimationFrame(frame);
  });
}

/* ---------- the slab ---------- */

function createState(slab) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sil-canvas';
  slab.appendChild(canvas);
  const st = {
    slab,
    canvas,
    ctx: canvas.getContext('2d'),
    gc: 0,
    gr: 0,
    mask: new Uint8Array(0),
    bytes: new Uint8Array(1),
    c0: NaN,
    r0: NaN,
    nc: 0,
    nr: 0,
    key: '',
  };
  slab._sil = st;
  states.add(st);
  return st;
}

function build(slab, block, rect) {
  const st = slab._sil || createState(slab);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  st.gc = Math.ceil(w / CELL);
  st.gr = Math.ceil(h / CELL);
  st.bytes = collectBytes(block);
  st.mask = makeMask(headingText(block), st.gc, st.gr, w, h);
  st.key = ''; // draw again next frame
  ensureHook();
}

export const silicon = { build, onResize: build };
export default silicon;