// HUD label, depth meter and ?debug panel. Decoration only (inside #deep, aria-hidden).
// Step 7: while a layer is peeled over the whole screen the label says "full page".
import { onDepth, getPeel } from './lens.js';

const NAMES = ['SURFACE', 'BLUEPRINT', 'SOURCE', 'MEMORY', 'SILICON'];
const DASH = '\u2014';
const SEP = ' \u00b7 ';

// The data-block id under the lens (or a dash).
function blockAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const block = el?.closest('[data-block]');
  return block ? block.dataset.block : DASH;
}

function startDebug(deep) {
  if (!new URLSearchParams(window.location.search).has('debug')) return () => {};

  const box = document.createElement('div');
  box.className = 'deep-debug';
  deep.append(box);

  let frames = 0;
  let last = performance.now();
  let depthNow = 0;
  let holdingNow = false;

  const off = onDepth((d, info) => {
    frames += 1;
    depthNow = d;
    holdingNow = info.holding;
  });

  const timer = setInterval(() => {
    const now = performance.now();
    const fps = Math.round((frames * 1000) / (now - last));
    const mode = document.documentElement.classList.contains('is-portal') ? 'portal' : 'clip';
    box.textContent =
      'FPS ' + (frames ? fps : 'idle') + SEP + 'depth ' + depthNow.toFixed(2) + SEP +
      (holdingNow ? 'holding' : 'free') + SEP + mode;
    frames = 0;
    last = now;
  }, 500);

  return () => {
    off();
    clearInterval(timer);
    box.remove();
  };
}

export function startHud() {
  const deep = document.getElementById('deep');
  if (!deep) return () => {};

  const hud = deep.querySelector('.deep-hud');
  const hudText = deep.querySelector('.deep-hud__text');
  const ticks = [...deep.querySelectorAll('.deep-meter__tick')];
  const num = deep.querySelector('.deep-meter__num');

  let lastLayer = -1;
  let lastBlock = '';
  let lastNum = '';
  let lastX = -9999;
  let lastY = -9999;
  let lastCheck = 0;
  let side = 'right';

  const offDepth = onDepth((depth, info) => {
    const { layer } = info;

    // Meter
    if (layer !== lastLayer) {
      ticks.forEach((t, i) => t.classList.toggle('is-active', i === layer));
    }
    const n = depth.toFixed(1);
    if (n !== lastNum) {
      num.textContent = n;
      lastNum = n;
    }

    // HUD: layer name + data-block id under the lens (or "full page" when peeled)
    let block = DASH;
    if (layer > 0) {
      if (getPeel() > 0) {
        block = 'full page';
      } else {
        const now = performance.now();
        const moved = Math.abs(info.x - lastX) + Math.abs(info.y - lastY) > 2;
        if (moved || now - lastCheck > 120) {
          block = blockAt(info.x, info.y);
          lastCheck = now;
          lastX = info.x;
          lastY = info.y;
        } else {
          block = lastBlock;
        }
      }
    }
    if (layer !== lastLayer || block !== lastBlock) {
      hudText.textContent = 'L' + layer + SEP + NAMES[layer] + SEP + block;
    }

    // Flip the label to the left near the right edge of the screen
    const s = info.x > window.innerWidth - 260 ? 'left' : 'right';
    if (s !== side) {
      side = s;
      hud.dataset.side = s;
    }

    lastLayer = layer;
    lastBlock = block;
  });

  const offDebug = startDebug(deep);

  return () => {
    offDepth();
    offDebug();
  };
}