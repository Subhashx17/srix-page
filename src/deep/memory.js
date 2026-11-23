// Layer 3: MEMORY.
// A hex dump of the REAL bytes of the block text (UTF-8), then the bytes of its outerHTML (dimmer).
// If the block has a same-origin <img>, its first 192 real bytes are shown too, signature in bright amber.
// The dump is split into columns so it fills wide slabs. A faint read head sweeps down the rows (CSS).
// Exports: memory (also default) = { build, onResize }

const ENC = new TextEncoder();
const ROW_BYTES = 16;
const ROW_H = 15; // px, same as line-height in deep.css
const PAD_X = 10;
const PAD_Y = 8;
const COL_W = 528; // 80 characters x 6.6px (JetBrains Mono at 11px)
const COL_GAP = 28;
const MAX_ROWS = 320; // never more rows than this per slab
const IMG_BYTES = 192;
const IMG_ADDR_SHIFT = 0x10000; // the image bytes get their own address
const DOT = '\u00B7';

const SIGNATURES = [
  { name: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { name: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
  { name: 'RIFF/WebP', bytes: [0x52, 0x49, 0x46, 0x46] },
];

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).toUpperCase().padStart(2, '0'));
const hex = (n, width) => n.toString(16).toUpperCase().padStart(width, '0');

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- a stable address for every block ---------- */

function hashId(id) {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const baseAddress = (id) => 0x7ff60000 + (hashId(id) & 0xfff0);

/* ---------- one row = address, 16 hex bytes, ASCII ---------- */

// sigLen: how many leading bytes are the file signature (0 = none)
function hexRow(bytes, from, addr, sigLen) {
  const n = Math.min(ROW_BYTES, bytes.length - from);
  let hexPart = '';
  let asc = '';
  for (let i = 0; i < ROW_BYTES; i++) {
    if (i > 0) hexPart += i === 8 ? '  ' : ' ';
    if (i < n) {
      const b = bytes[from + i];
      hexPart += from + i < sigLen ? `<b class="mem-sig">${HEX[b]}</b>` : HEX[b];
      asc += b >= 0x20 && b < 0x7f ? esc(String.fromCharCode(b)) : '.';
    } else {
      hexPart += '  ';
    }
  }
  return (
    `<span class="mem-addr">${hex(addr, 12)}</span>  ` +
    `<span class="mem-hex">${hexPart}</span>  ` +
    `<span class="mem-asc">${asc}</span>`
  );
}

function dumpRows(bytes, startAddr, maxRows, sigLen, dim) {
  const rows = [];
  for (let off = 0; off < bytes.length && rows.length < maxRows; off += ROW_BYTES) {
    const html = hexRow(bytes, off, startAddr + off, sigLen);
    rows.push(dim ? `<span class="mem-dim">${html}</span>` : html);
  }
  return rows;
}

const comment = (text) => `<span class="mem-com">${esc(text)}</span>`;

/* ---------- the image head (first 192 bytes, fetched once) ---------- */

const headCache = new Map(); // url -> Promise<Uint8Array | null>

function loadHead(url) {
  if (headCache.has(url)) return headCache.get(url);
  const p = (async () => {
    try {
      const res = await fetch(url, {
        headers: { Range: `bytes=0-${IMG_BYTES - 1}` },
        credentials: 'same-origin',
      });
      if (!res.ok || !res.body) return null;
      const reader = res.body.getReader();
      const out = new Uint8Array(IMG_BYTES);
      let n = 0;
      while (n < IMG_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        const take = Math.min(value.length, IMG_BYTES - n);
        out.set(value.subarray(0, take), n);
        n += take;
      }
      reader.cancel().catch(() => {}); // do not download the rest
      return n ? out.slice(0, n) : null;
    } catch {
      return null;
    }
  })();
  headCache.set(url, p);
  return p;
}

function findImage(block) {
  const img = block.querySelector('img');
  const src = img && (img.currentSrc || img.getAttribute('src'));
  if (!src) return null;
  try {
    const u = new URL(src, document.baseURI);
    if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return null; // same origin only
    return u;
  } catch {
    return null;
  }
}

function describeImage(url, bytes) {
  const sig = SIGNATURES.find((s) => s.bytes.every((v, i) => bytes[i] === v));
  const file = decodeURIComponent(url.pathname.split('/').pop() || 'image');
  return {
    file,
    bytes,
    sigLen: sig ? sig.bytes.length : 0,
    sigText: sig ? sig.bytes.map((b) => HEX[b]).join(' ') : '??',
    sigName: sig ? sig.name : 'unknown',
  };
}

/* ---------- build all rows, then put them in columns ---------- */

function assemble(st, capacity) {
  const rows = [];
  const textLen = st.text.length;
  rows.push(
    comment(`// 0x${hex(st.base, 12)} ${DOT} block ${st.id} ${DOT} ${textLen} bytes ${DOT} UTF-8`)
  );

  if (st.img) {
    const im = st.img;
    rows.push(
      comment(
        `// 0x${hex(st.base + IMG_ADDR_SHIFT, 12)} ${DOT} img ${im.file} ${DOT} first ${im.bytes.length} bytes ${DOT} signature `
      ) + `<b class="mem-sig">${esc(im.sigText)} = ${esc(im.sigName)}</b>`
    );
    rows.push(...dumpRows(im.bytes, st.base + IMG_ADDR_SHIFT, Math.max(0, capacity - rows.length), im.sigLen, false));
  }

  rows.push(...dumpRows(st.text, st.base, Math.max(0, capacity - rows.length), 0, false));

  // The text ended and there is still room: continue with the HTML bytes, dimmer.
  if (rows.length < capacity - 1 && st.html.length) {
    const htmlAddr = st.base + Math.ceil(textLen / ROW_BYTES) * ROW_BYTES + ROW_BYTES;
    rows.push(comment(`// 0x${hex(htmlAddr, 12)} ${DOT} outerHTML ${DOT} ${st.htmlLen} bytes`));
    rows.push(...dumpRows(st.html, htmlAddr, capacity - rows.length, 0, true));
  }
  return rows.slice(0, capacity);
}

function layout(slab, st) {
  const cols = Math.max(1, Math.floor((st.w - PAD_X * 2 + COL_GAP) / (COL_W + COL_GAP)));
  const rpc = Math.max(3, Math.floor((st.h - PAD_Y * 2) / ROW_H)); // rows per column
  const rows = assemble(st, Math.min(MAX_ROWS, cols * rpc));

  for (let c = 0; c < Math.max(cols, st.cols.length); c++) {
    let pre = st.cols[c];
    if (c >= cols) {
      if (pre) pre.hidden = true;
      continue;
    }
    if (!pre) {
      pre = st.cols[c] = document.createElement('pre');
      pre.className = 'mem-col';
      slab.appendChild(pre);
    }
    pre.hidden = false;
    pre.style.left = `${PAD_X + c * (COL_W + COL_GAP)}px`;
    const html = rows.slice(c * rpc, (c + 1) * rpc).join('\n');
    if (pre._h !== html) {
      pre.innerHTML = html;
      pre._h = html;
    }
  }
  // the read head sweeps over this many rows (CSS uses the variable)
  slab.style.setProperty('--mem-rows', String(Math.max(1, Math.min(rpc, rows.length))));
}

/* ---------- the slab ---------- */

function createState(slab) {
  const head = document.createElement('i');
  head.className = 'mem-head';
  slab.appendChild(head);
  slab._mem = {
    slab,
    cols: [],
    id: 'block',
    base: 0,
    w: 0,
    h: 0,
    text: new Uint8Array(0),
    html: new Uint8Array(0),
    htmlLen: 0,
    img: null,
    imgUrl: '',
  };
  return slab._mem;
}

function watchImage(st, block) {
  if (st.imgUrl) return; // already asked once
  const url = findImage(block);
  if (!url) return;
  st.imgUrl = url.href;
  loadHead(url.href).then((bytes) => {
    if (!bytes || !st.slab.isConnected) return;
    st.img = describeImage(url, bytes);
    layout(st.slab, st);
  });
}

function build(slab, block, rect) {
  const st = slab._mem || createState(slab);
  const full = ENC.encode(block.outerHTML);
  st.id = block.dataset.block || 'block';
  st.base = baseAddress(st.id);
  st.w = rect.width;
  st.h = rect.height;
  st.text = ENC.encode(block.innerText || '');
  st.htmlLen = full.length;
  st.html = full.subarray(0, MAX_ROWS * ROW_BYTES);
  watchImage(st, block);
  layout(slab, st);
}

export const memory = { build, onResize: build };
export default memory;