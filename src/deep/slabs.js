// Slabs. One slab per [data-block] element, inside every deep layer.
// A slab sits at the same screen position and size as its block.
// Content is built lazily, the first time the lens gets close to the block
// (or, when a layer is peeled over the whole screen, for every block on screen).
// Step 7: slabs live in a .deep-inner wrapper (needed by the portal fallback in deep.css).
// Exports: startSlabs, stopSlabs, registerLayer, refreshSlabs

import { onDepth, getPeel } from './lens.js';

// header and footer may sit outside <main id="surface">, so #app is searched too.
const BLOCK_SELECTOR = '#surface [data-block], #app [data-block]';
const LAYER_RADII = [170, 125, 85, 50]; // same numbers as MAX_RADII in lens.js
const NEAR_PAD = 24; // extra px around the lens circle that counts as "touching"
const BUILD_AHEAD = 1.5; // layer n wakes up when depth passes (n - 1.5)
const VIEW_PAD = 100; // peel: blocks this close to the screen are built too

const layerDefs = new Map(); // layer number -> { n, api, el, host }
const blocks = []; // { id, el, rect, x, y, w, h, slabs: Map(layer number -> slab) }

let root = null;
let started = false;
let abort = null;
let resizeObs = null;
let offDepth = null;
let rafId = 0;
let dirty = false;
let wasOpen = false;
let shownCount = 0;

const lens = { x: -9999, y: -9999, depth: 0 };

/* ---------- slabs and blocks ---------- */

function createSlab(def, b) {
  const el = document.createElement('div');
  el.className = 'slab';
  el.dataset.slabLayer = String(def.n);
  el.dataset.slab = b.id;
  def.host.appendChild(el);
  if (Number.isFinite(b.x)) {
    el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
    el.style.width = `${b.w}px`;
    el.style.height = `${b.h}px`;
  }
  return { el, layer: def.n, block: b, built: false, stale: false, shown: false };
}

function destroySlab(s) {
  if (s.shown) shownCount -= 1;
  s.el.remove();
}

function addBlock(el) {
  const b = {
    id: el.dataset.block || 'block',
    el,
    rect: null,
    x: NaN,
    y: NaN,
    w: NaN,
    h: NaN,
    slabs: new Map(),
  };
  resizeObs?.observe(el);
  for (const def of layerDefs.values()) b.slabs.set(def.n, createSlab(def, b));
  return b;
}

function removeBlock(b) {
  resizeObs?.unobserve(b.el);
  for (const s of b.slabs.values()) destroySlab(s);
  b.slabs.clear();
}

function scan() {
  const els = [...new Set(document.querySelectorAll(BLOCK_SELECTOR))];
  const known = new Map(blocks.map((b) => [b.el, b]));
  for (const b of blocks) {
    if (!els.includes(b.el)) removeBlock(b);
  }
  blocks.length = 0;
  for (const el of els) blocks.push(known.get(el) || addBlock(el));
}

/* ---------- positions: only when something changed ---------- */

function applyRect(b, r) {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const w = Math.round(r.width);
  const h = Math.round(r.height);
  const moved = x !== b.x || y !== b.y;
  const resized = w !== b.w || h !== b.h;
  b.rect = r;
  b.x = x;
  b.y = y;
  b.w = w;
  b.h = h;
  if (!moved && !resized) return;
  for (const s of b.slabs.values()) {
    if (moved) s.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (resized) {
      s.el.style.width = `${w}px`;
      s.el.style.height = `${h}px`;
      if (s.built) s.stale = true; // rebuilt when the lens is near again
    }
  }
}

function flush() {
  rafId = 0;
  if (!started || !dirty) return;
  dirty = false;
  const rects = blocks.map((b) => b.el.getBoundingClientRect()); // read first
  blocks.forEach((b, i) => applyRect(b, rects[i])); // then write
  updateNear();
}

function markDirty() {
  if (!started) return;
  dirty = true;
  // While the lens is closed nobody sees the slabs, so we wait.
  if (lens.depth > 0.01 && !rafId) rafId = requestAnimationFrame(flush);
}

function onSurfaceChange(e) {
  if (e && e.target instanceof Node && root && root.contains(e.target)) return;
  markDirty();
}

/* ---------- which slabs are near the lens ---------- */

function hits(b, n) {
  if (!(b.w > 0 && b.h > 0)) return false;
  const r = (LAYER_RADII[n - 1] ?? 50) + NEAR_PAD;
  const dx = lens.x - Math.min(b.x + b.w, Math.max(b.x, lens.x));
  const dy = lens.y - Math.min(b.y + b.h, Math.max(b.y, lens.y));
  return dx * dx + dy * dy <= r * r;
}

// Peel: is the block on (or near) the screen?
function inView(b) {
  if (!(b.w > 0 && b.h > 0)) return false;
  return (
    b.x < window.innerWidth + VIEW_PAD &&
    b.x + b.w > -VIEW_PAD &&
    b.y < window.innerHeight + VIEW_PAD &&
    b.y + b.h > -VIEW_PAD
  );
}

function buildSlab(s) {
  const def = layerDefs.get(s.layer);
  const b = s.block;
  if (!def || !b.rect) return;
  try {
    if (!s.built || typeof def.api.onResize !== 'function') {
      def.api.build(s.el, b.el, b.rect);
    } else {
      def.api.onResize(s.el, b.el, b.rect);
    }
  } catch (err) {
    console.error(`[slabs] layer ${s.layer} failed on block "${b.id}"`, err);
  }
  s.built = true;
  s.stale = false;
}

function updateNear() {
  const open = lens.depth > 0.01;
  if (!open && shownCount === 0) return;
  const peel = getPeel(); // 0, or the layer that covers the whole screen
  for (const b of blocks) {
    for (const s of b.slabs.values()) {
      const want = peel
        ? s.layer === peel && inView(b)
        : open && lens.depth > s.layer - BUILD_AHEAD && hits(b, s.layer);
      if (want !== s.shown) {
        s.shown = want;
        shownCount += want ? 1 : -1;
        s.el.classList.toggle('is-near', want);
      }
      if (want && (!s.built || s.stale)) buildSlab(s);
    }
  }
}

/* ---------- public API ---------- */

// Plug a layer in. api = { build(slabEl, blockEl, rect), onResize(slabEl, blockEl, rect) }
// build runs the first time the lens touches the block.
// onResize runs when the block changed size (if missing, build runs again).
// rect = the block's getBoundingClientRect() in viewport pixels.
// Returns a function that unplugs the layer.
export function registerLayer(n, api) {
  const layerNo = Number(n);
  const el = document.querySelector(`#deep .deep-layer[data-layer="${layerNo}"]`);
  if (!el || !api || typeof api.build !== 'function') {
    console.warn(`[slabs] registerLayer(${n}) needs a .deep-layer and a build function`);
    return () => {};
  }
  if (layerDefs.has(layerNo)) unregisterLayer(layerNo);

  // The wrapper that holds the slabs (the portal fallback moves it opposite to the layer).
  let host = el.querySelector(':scope > .deep-inner');
  if (!host) {
    host = document.createElement('div');
    host.className = 'deep-inner';
    el.appendChild(host);
  }

  const def = { n: layerNo, api, el, host };
  layerDefs.set(layerNo, def);
  for (const b of blocks) b.slabs.set(layerNo, createSlab(def, b));
  markDirty();
  return () => unregisterLayer(layerNo);
}

function unregisterLayer(n) {
  for (const b of blocks) {
    const s = b.slabs.get(n);
    if (s) {
      destroySlab(s);
      b.slabs.delete(n);
    }
  }
  layerDefs.delete(n);
}

export function startSlabs() {
  if (started) return;
  root = document.getElementById('deep');
  if (!root) return;
  started = true;
  abort = new AbortController();
  const o = { signal: abort.signal };

  if ('ResizeObserver' in window) resizeObs = new ResizeObserver(markDirty);
  scan();

  window.addEventListener('scroll', markDirty, { ...o, passive: true });
  window.addEventListener('resize', markDirty, { ...o, passive: true });
  window.addEventListener('load', markDirty, o);
  document.addEventListener('transitionend', onSurfaceChange, { ...o, capture: true });
  document.addEventListener('animationend', onSurfaceChange, { ...o, capture: true });
  document.addEventListener('toggle', onSurfaceChange, { ...o, capture: true });
  document.fonts?.ready.then(markDirty);

  offDepth = onDepth((depth, info) => {
    lens.x = info.x;
    lens.y = info.y;
    lens.depth = depth;
    const open = depth > 0.01;
    if (open && !wasOpen && dirty) flush(); // fresh positions the moment the lens opens
    wasOpen = open;
    updateNear();
  });

  dirty = true;
}

export function stopSlabs() {
  if (!started) return;
  started = false;
  abort.abort();
  offDepth?.();
  offDepth = null;
  for (const b of blocks) removeBlock(b);
  blocks.length = 0;
  resizeObs?.disconnect();
  resizeObs = null;
  cancelAnimationFrame(rafId);
  rafId = 0;
  dirty = false;
  wasOpen = false;
  shownCount = 0;
}

// Look for blocks again (after the Surface was changed by code).
export function refreshSlabs() {
  if (!started) return;
  scan();
  markDirty();
}