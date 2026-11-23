// Layer 1: BLUEPRINT.
// White 1px outlines, corner ticks, size labels, padding and margin lines.
// The 8px grid is plain CSS on the slab (see deep.css).
// Exports: blueprint (also default) = { build, onResize }

const MAX_ELEMENTS = 40; // child elements drawn besides the block itself
const SKIP = new Set(['script', 'style', 'template', 'noscript', 'br', 'wbr', 'meta', 'link', 'title']);
const LABEL_H = 12; // px
const CHAR_W = 6; // JetBrains Mono at 10px
const LABEL_PAD = 6; // 3px left + 3px right
const MIN_DIM = 3; // smaller padding or margin is not drawn
const DIM_TEXT_MIN = 14; // band thickness needed to show the number
const DOT = '\u00B7';
const TIMES = '\u00D7';

function sameBox(a, b) {
  return (
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

/* ---------- step 1: read everything (no writes here) ---------- */

function describe(el, r, base, isRoot) {
  const cs = getComputedStyle(el);
  const px = (p) => Math.max(0, parseFloat(cs[p]) || 0);
  const left = Math.round(r.left - base.left);
  const top = Math.round(r.top - base.top);
  const w = Math.max(1, Math.round(r.right - base.left) - left);
  const h = Math.max(1, Math.round(r.bottom - base.top) - top);
  const tag = el.localName;
  const size = `${Math.round(r.width)}${TIMES}${Math.round(r.height)}`;
  return {
    left,
    top,
    w,
    h,
    isRoot,
    tag,
    label: isRoot
      ? `${el.dataset.block || tag} ${DOT} ${tag} ${DOT} ${size}`
      : `${tag} ${DOT} ${size}`,
    inline: cs.display === 'inline',
    pad: [px('paddingTop'), px('paddingRight'), px('paddingBottom'), px('paddingLeft')],
    mar: [px('marginTop'), px('marginRight'), px('marginBottom'), px('marginLeft')],
  };
}

function measure(block) {
  const base = block.getBoundingClientRect();
  const items = [describe(block, base, base, true)];
  const rects = new Map([[block, base]]);
  const queue = Array.from(block.children); // level by level, so big boxes come first

  for (let i = 0; i < queue.length && items.length <= MAX_ELEMENTS; i++) {
    const el = queue[i];
    if (SKIP.has(el.localName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue; // hidden, like a closed <details>
    rects.set(el, r);
    if (!(el instanceof SVGElement)) queue.push(...el.children);
    const parentRect = rects.get(el.parentElement);
    if (parentRect && sameBox(parentRect, r)) continue; // same box as its parent: skip
    items.push(describe(el, r, base, false));
  }
  return items;
}

/* ---------- step 2: write (reuse the same nodes every time) ---------- */

function makeBox() {
  const el = document.createElement('div');
  el.className = 'bp-box';
  const label = document.createElement('span');
  label.className = 'bp-label';
  el.appendChild(label);
  return { el, label, dims: [], text: '' };
}

function makeDim(isMargin, vertical) {
  const d = document.createElement('i');
  d.className = `bp-dim ${isMargin ? 'bp-dim--mar' : 'bp-dim--pad'} ${vertical ? 'is-v' : 'is-h'}`;
  return d;
}

// side: 0 top, 1 right, 2 bottom, 3 left. Padding is inside the box, margin is outside.
function band(isMargin, side, w, h, v) {
  if (side === 0) return [0, isMargin ? -v : 0, w, v];
  if (side === 2) return [0, isMargin ? h : h - v, w, v];
  if (side === 3) return [isMargin ? -v : 0, 0, v, h];
  return [isMargin ? w : w - v, 0, v, h];
}

function paintDims(box, it) {
  for (let k = 0; k < 8; k++) {
    const isMargin = k >= 4;
    const side = k % 4;
    const v = (isMargin ? it.mar : it.pad)[side];
    const vertical = side === 0 || side === 2;
    let d = box.dims[k];
    if (v < MIN_DIM || (it.inline && vertical)) {
      if (d) d.hidden = true;
      continue;
    }
    if (!d) {
      d = box.dims[k] = makeDim(isMargin, vertical);
      box.el.appendChild(d);
    }
    const [x, y, w, h] = band(isMargin, side, it.w, it.h, v);
    d.hidden = false;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.style.width = `${w}px`;
    d.style.height = `${h}px`;
    if (v >= DIM_TEXT_MIN) d.dataset.v = String(Math.round(v));
    else delete d.dataset.v;
  }
}

function paintLabel(box, it, taken) {
  let text = it.label;
  let width = text.length * CHAR_W + LABEL_PAD;
  if (width > it.w) {
    text = it.tag; // too narrow: show only the tag name
    width = text.length * CHAR_W + LABEL_PAD;
  }
  if (width > it.w) {
    box.label.hidden = true;
    return;
  }
  // Try inside the box (top, then lower), then just above the box.
  const slots = [];
  for (let y = 0; y + LABEL_H <= it.h && slots.length < 5; y += LABEL_H) slots.push(y);
  slots.push(-LABEL_H);

  for (const dy of slots) {
    const a = { x1: it.left, y1: it.top + dy, x2: it.left + width, y2: it.top + dy + LABEL_H };
    const clash = taken.some((t) => a.x1 < t.x2 && a.x2 > t.x1 && a.y1 < t.y2 && a.y2 > t.y1);
    if (clash) continue;
    taken.push(a);
    if (box.text !== text) {
      box.label.textContent = text;
      box.text = text;
    }
    box.label.style.top = `${dy}px`;
    box.label.hidden = false;
    return;
  }
  box.label.hidden = true; // no free spot
}

function paint(slab, items) {
  const pool = slab._bp || (slab._bp = { boxes: [] });
  const taken = [];
  items.forEach((it, i) => {
    let box = pool.boxes[i];
    if (!box) {
      box = pool.boxes[i] = makeBox();
      slab.appendChild(box.el);
    }
    box.el.hidden = false;
    box.el.classList.toggle('bp-box--root', it.isRoot);
    box.el.style.transform = `translate3d(${it.left}px, ${it.top}px, 0)`;
    box.el.style.width = `${it.w}px`;
    box.el.style.height = `${it.h}px`;
    paintLabel(box, it, taken);
    paintDims(box, it);
  });
  for (let i = items.length; i < pool.boxes.length; i++) pool.boxes[i].el.hidden = true;
}

function draw(slab, block) {
  paint(slab, measure(block));
}

export const blueprint = { build: draw, onResize: draw };
export default blueprint;