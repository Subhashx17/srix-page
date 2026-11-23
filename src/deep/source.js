// Layer 2: SOURCE.
// The real HTML of the block (pretty-printed, colored), then a "computed" CSS rule
// made from getComputedStyle. The slab fades out at the bottom.
// Exports: source (also default) = { build, onResize }

const MAX_TEXT = 60; // longer text is cut with an ellipsis
const LINE_H = 15; // px, same as line-height in deep.css
const PAD_Y = 8; // px, top and bottom padding of the slab
const MIN_HTML_LINES = 4;
const INDENT = '  ';
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);
const PROPS = [
  'display',
  'font-family',
  'font-size',
  'line-height',
  'color',
  'padding',
  'margin',
  'grid-template-columns',
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cut = (s, n = MAX_TEXT) => (s.length > n ? `${s.slice(0, n)}\u2026` : s);
const tok = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;
const squash = (s) => s.replace(/\s+/g, ' ').trim();

/* ---------- pretty HTML ---------- */

function openTag(el) {
  let s = tok('tk-pun', '<') + tok('tk-tag', el.localName);
  for (const a of el.attributes) {
    s += ` ${tok('tk-attr', a.name)}`;
    if (a.value !== '') s += tok('tk-pun', '=') + tok('tk-str', `"${cut(squash(a.value))}"`);
  }
  return s + tok('tk-pun', '>');
}

const closeTag = (el) => tok('tk-pun', '</') + tok('tk-tag', el.localName) + tok('tk-pun', '>');

function walk(node, depth, out) {
  const pad = INDENT.repeat(depth);

  if (node.nodeType === 3) {
    const text = squash(node.nodeValue);
    if (text) out.push(pad + tok('tk-txt', cut(text)));
    return;
  }
  if (node.nodeType === 8) {
    out.push(pad + tok('tk-com', `<!-- ${cut(squash(node.nodeValue))} -->`));
    return;
  }
  if (node.nodeType !== 1) return;

  if (VOID.has(node.localName)) {
    out.push(pad + openTag(node));
    return;
  }
  const kids = [...node.childNodes].filter(
    (n) => n.nodeType === 1 || n.nodeType === 8 || (n.nodeType === 3 && n.nodeValue.trim())
  );
  if (!kids.length) {
    out.push(pad + openTag(node) + closeTag(node));
    return;
  }
  if (kids.length === 1 && kids[0].nodeType === 3) {
    out.push(pad + openTag(node) + tok('tk-txt', cut(squash(kids[0].nodeValue))) + closeTag(node));
    return;
  }
  out.push(pad + openTag(node));
  for (const k of kids) walk(k, depth + 1, out);
  out.push(pad + closeTag(node));
}

function prettyLines(block) {
  const out = [];
  walk(block, 0, out);
  return out;
}

/* ---------- computed rule ---------- */

function selectorOf(el) {
  let s = el.localName;
  if (el.id) s += `#${el.id}`;
  for (const c of el.classList) s += `.${c}`;
  return cut(s);
}

// 4 sides -> shortest CSS shorthand ("0px 24px")
function box4(cs, prop) {
  const v = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs[`${prop}${s}`]);
  if (v[1] === v[3]) {
    v.pop();
    if (v[2] === v[0]) {
      v.pop();
      if (v[1] === v[0]) v.pop();
    }
  }
  return v.join(' ');
}

function valueHtml(prop, v) {
  if (prop === 'color' && /^rgba?\(\s*[\d.\s,/%]+\)$/.test(v)) {
    return `<i class="src-swatch" style="background:${v}"></i>${tok('tk-val', v)}`;
  }
  return tok(prop === 'font-family' ? 'tk-str' : 'tk-val', v);
}

function computedRule(el) {
  const cs = getComputedStyle(el);
  const get = (p) => {
    if (p === 'padding' || p === 'margin') return box4(cs, p);
    return cs.getPropertyValue(p) || '';
  };
  const lines = [
    tok('tk-com', '/* computed */'),
    `${tok('tk-sel', selectorOf(el))} ${tok('tk-pun', '{')}`,
  ];
  for (const p of PROPS) {
    lines.push(
      INDENT + tok('tk-prop', p) + tok('tk-pun', ': ') + valueHtml(p, cut(get(p))) + tok('tk-pun', ';')
    );
  }
  lines.push(tok('tk-pun', '}'));
  return lines;
}

/* ---------- the slab ---------- */

function makeUi(slab) {
  const html = document.createElement('pre');
  html.className = 'src-html';
  const rule = document.createElement('pre');
  rule.className = 'src-rule';
  const fade = document.createElement('div');
  fade.className = 'src-fade';
  slab.append(html, rule, fade);
  slab._src = { html, rule };
  return slab._src;
}

function setHtml(el, str) {
  if (el._h === str) return; // nothing changed: do not touch the DOM
  el.innerHTML = str;
  el._h = str;
}

function build(slab, block, rect) {
  // read first
  const rule = computedRule(block);
  const html = prettyLines(block);

  // how many HTML lines fit above the computed rule
  const room = Math.floor((rect.height - PAD_Y * 2) / LINE_H);
  const budget = Math.max(MIN_HTML_LINES, room - rule.length - 1);
  let shown = html;
  if (html.length > budget) {
    shown = html.slice(0, budget - 1);
    shown.push(tok('tk-com', `<!-- \u2026 ${html.length - shown.length} more lines -->`));
  }

  // then write
  const ui = slab._src || makeUi(slab);
  setHtml(ui.html, shown.join('\n'));
  setHtml(ui.rule, rule.join('\n'));
}

export const source = { build, onResize: build };
export default source;