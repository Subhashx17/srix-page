// Entry point. Loads fonts and styles, builds the Surface,
// then loads the lens and the layers after the page is ready (step 8).
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';

import './styles/tokens.css';
import './styles/surface.css';
import './styles/deep.css';
import './styles/polish.css';

import { content } from './content.js';
import { renderSurface } from './surface.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TextHoverEffect } from './components/ui/text-hover-effect.jsx';

// Title and description now live in index.html (the single source of truth for SEO).
document.documentElement.lang = content.site.lang;

renderSurface(document.getElementById('app'), content);
// Mount Aceternity's hover effect on the hero name.
const heroName = document.getElementById('hero-name-effect');

if (heroName) {
  createRoot(heroName).render(
    React.createElement(TextHoverEffect, {
      text: content.person.name,
      duration: 0.25,
    })
  );
}

// The deep overlay is decoration only: hidden from screen readers AND not focusable.
const deepEl = document.getElementById('deep');
if (deepEl) {
  deepEl.setAttribute('aria-hidden', 'true');
  deepEl.inert = true;
}

// The contact links as plain, visible text on the Surface,
// so nobody needs the secret layer to reach me. (Later: move this into surface.js.)
function addPlainContact(c) {
  const block = document.querySelector('#surface [data-block="contact"]');
  const links = c.contact && c.contact.links;
  if (!block || !links || !links.length || block.querySelector('.contact__plain')) return;

  const list = document.createElement('ul');
  list.className = 'contact__plain';
  for (const l of links) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'contact__plain-label';
    label.textContent = l.label;
    const a = document.createElement('a');
    a.href = l.href;
    a.textContent = l.text || l.href;
    li.append(label, a);
    list.append(li);
  }
  block.append(list);
}

addPlainContact(content);

// Fade-up on scroll. Fully off when the user prefers reduced motion,
// and the page still shows everything if this code does not run.
function setupReveal() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const items = document.querySelectorAll('#surface .block');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );

  document.documentElement.classList.add('reveal-on');
  items.forEach((el) => observer.observe(el));
}

setupReveal();

// The deep layers (steps 3 to 7). Loaded late, so the Surface paints first.
// The Surface works fully even if this never runs.
async function loadDeep() {
  const [lens, hud, slabs, blueprint, source, memory, silicon, intro, human, sound, layersUi, perf] =
    await Promise.all([
      import('./deep/lens.js'),
      import('./deep/hud.js'),
      import('./deep/slabs.js'),
      import('./deep/blueprint.js'),
      import('./deep/source.js'),
      import('./deep/memory.js'),
      import('./deep/silicon.js'),
      import('./deep/intro.js'),
      import('./deep/human.js'),
      import('./deep/sound.js'),
      import('./deep/layers-ui.js'),
      import('./deep/perf.js'),
    ]);

  // The lens.
  lens.startLens();
  hud.startHud();

  // The layers. Register all four, then start the slabs.
  slabs.registerLayer(1, blueprint.default);
  slabs.registerLayer(2, source.default);
  slabs.registerLayer(3, memory.default);
  slabs.registerLayer(4, silicon.default);
  slabs.startSlabs();

  // The secret layer, the optional hum.
  human.startHuman(content);
  sound.startSound(content.sound);

  // Layers button, keys 0 to 5, speed helpers.
  layersUi.startLayersUi();
  perf.startPerf();

  // Screenshot mode: /?og opens the lens on the hero name and holds still.
  if (new URLSearchParams(location.search).has('og')) {
    document.documentElement.classList.add('og-shot');
    await document.fonts.ready;
    window.scrollTo(0, 0);
    const h1 = document.querySelector('#surface [data-block="hero"] h1');
    const r = h1 ? h1.getBoundingClientRect() : null;
    lens.setAuto(true);
    lens.moveTo(r ? r.left + r.width * 0.35 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2);
    lens.setDepthTarget(3.4);
    return;
  }

  // The opening move.
  intro.startIntro({ hint: content.hero.hint });
}

function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}

function boot() {
  whenIdle(() => {
    loadDeep().catch((err) => console.warn('Deep layers did not load:', err));
  });
}

if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot, { once: true });