# PROJECT_STATE.md — UNDERNEATH

Keep every name and structure exactly as written here. Other Claude accounts do the other steps.

## THE BIG IDEA
The page is only the top layer (Surface). A glass lens follows the cursor. When the user presses and holds, the lens drills down. Inside the circle the page opens in 4 rings: Blueprint (biggest), Source, Memory, Silicon (smallest, in the center). Let go and it springs back. Every layer is built live from the REAL content under the lens: real HTML, real bytes, real bits. A 5th layer (Human) opens when the visitor keeps holding at full depth (step 6), or with key 5 / the Layers panel (step 7). Any layer can also be "peeled" over the whole screen (step 7).

## THE LOOKS
- Surface: dark theme: background ("paper") dark indigo #13123A, text ("ink") pale celadon #E4F1E8, accents soft indigo #9D9BF5 and celadon #8FD0AE. Instrument Serif for headings, Inter for body. Calm, spacious, editorial, very professional.
- Blueprint: #0A2A5E, white 1px lines.
- Source: #0E0F12, syntax colors, JetBrains Mono.
- Memory: #000000, amber #FFB000 hex dump.
- Silicon: #000000, cyan #00E5FF zeros and ones.
- Human: #07080A, paper-colored text, big Instrument Serif lines, accent dot.

## HARD RULES
- Vite + plain JavaScript (ES modules). No React, no Three.js, no paid services. Fonts from @fontsource npm packages (no Google Fonts links). Free GitHub Pages hosting, so vite.config.js uses base: './'.
- Original work only. Respect prefers-reduced-motion and prefers-contrast. The Surface must work fully without the lens (keyboard, screen reader, phone). Deep layers are decoration only: #deep is aria-hidden AND inert. (Exception: #human is a real dialog with real buttons, so it is NOT aria-hidden while open. The Surface shows the same contact info as plain text.)
- No focus traps anywhere. Everything must work with the keyboard and show a visible focus.
- Unknown values (email, LinkedIn, city): use a clear placeholder like YOUR_EMAIL_HERE and list it under TODO in this file.

## HOW TO ANSWER (every step, every time)
1. Exact file path for every file created or changed.
2. FULL file content, never snippets or diffs.
3. A numbered "Do this now" list (PowerShell commands, what to run, what to save).
4. "How to verify it worked": which page to open and what to see.
5. "If it is not showing up": the 2 or 3 most likely reasons.
6. At the very end: the FULL updated PROJECT_STATE.md in one code block.
Use very simple words. Keep explanations outside code under 150 words. If the answer is too long, stop at a clean file boundary, write "Part 1 of N, send continue", and wait. (The user prefers few parts: give as much as possible in one answer.)
The user is a complete beginner (1st-year B.Tech CSE, Windows + PowerShell). Act as a patient senior developer.
PowerShell 5.1 shows UTF-8 files garbled (â€”, Ã©) unless you use: Get-Content $f -Raw -Encoding UTF8. The files themselves are fine.

## NAMING RULES
- Folder: underneath
- Files: index.html, src/main.js, src/content.js, src/surface.js, src/styles/tokens.css, src/styles/surface.css, src/styles/deep.css, src/deep/*.js
- Every meaningful block gets class="block" and data-block="<unique-id>" (hero, about, work-anchor, work-usbcam, stack, now, contact...).
- Page root: <main id="surface">. Deep overlay: <div id="deep" aria-hidden="true"> (main.js also sets inert).
- CSS variables: --paper --ink --accent --bp --src --mem --sil

## MY CONTENT (lives in src/content.js as one object)
- Name: Nizampuram Srivardhan (handle: srix). 1st-year B.Tech CSE student at Anurag University, class of 2030. Builds apps and tools, learning C and cybersecurity.
- Projects: (1) Anchor: Flutter + Firebase app with Circle and Patient roles (games, Today timeline, Family tab). (2) USBCam Clone: turns an Android phone into a USB webcam for Windows (Kotlin app + Python client). (3) This portfolio, UNDERNEATH. Plus one empty placeholder project.
- Links: GitHub nizampuram-srix. All other links are placeholders.
- Copy: short, honest, confident. No buzzword soup.
- content.js writes special characters as \u escapes (\u00b7 = middle dot) so PowerShell and editors cannot break them.
- Step 6 additions to content.js: contact.links[].text (the visible plain text), content.human (label, lines[3], panelTitle, privacy, showCode, hideCode, back), content.sound (label, on, off). hero.hint is used by intro.js.
- The texts of the Layers button and panel are written in English inside src/deep/layers-ui.js (not in content.js).

## STEP 2 DESIGN DIRECTION (done)
Editorial and quiet, like a high-end print magazine. Dark theme: indigo background, celadon text, soft indigo and celadon accents, used rarely. Huge Instrument Serif name (56px to 168px, tight line height) with a small accent dot. Small uppercase JetBrains Mono labels like "§ 02 — Work". 12-column grid, max 1280px, 1px hairlines, faint vertical grid-line texture (about 4%). No gradients as decoration, no glassmorphism, no stock shadows. Work = full-width numbered rows with <details> case study; hover slides the title 12px and shows a small accent bar. Stack and Now = plain typographic lists. Fade-up on scroll, off with prefers-reduced-motion. Sticky minimal header (name left, 3 links right). Strong :focus-visible. Text contrast at least 4.5:1. Quiet empty spot bottom-left of the hero (div.hero__hint) for the hint "Hold anywhere to look deeper" (shown by intro.js).

## STEP 3 SPEC (done): the lens
- #deep with 4 children .deep-layer[data-layer="1".."4"]: position fixed, inset 0, pointer-events none, layer 4 on top, each clipped with clip-path: circle(var(--rN) at var(--lx) var(--ly)). 4 thin glowing rings follow the same circles.
- Max radii: L1 170px, L2 125px, L3 85px, L4 50px. Layer k starts opening when depth passes k-1 (easeInOutSine).
- Hold to drill: mouse pressed 200ms or D key held (touch: 250ms, see step 7). Depth rises to 4 at about 1.1 layers per second. On release it springs back to 0 with a tiny overshoot (damped spring, ZETA 0.5; reduced motion: no spring, instant).
- A quick click still works. After a drill, the next click is cancelled (within 400ms). While drilling: user-select none, selection cleared.
- setAuto(true): lens ignores pointer and D key (used by the intro, the Human layer and the Layers panel).
- HUD label "L2 · SOURCE · work-anchor" (layer name + data-block under the lens). Depth meter fixed on the right edge: 5 ticks and a number 0.0 to 4.0. ?debug in the URL shows FPS, depth, holding/free and clip/portal.

## STEP 4 SPEC (done): slabs, real Blueprint (L1) and real Source (L2)
- src/deep/slabs.js finds every [data-block] (selector '#surface [data-block], #app [data-block]'; header and footer may sit outside <main>). For each block it keeps one slab (div.slab[data-slab-layer=N][data-slab=<block id>]) inside every registered layer. Slab = position absolute, left 0, top 0, transform translate3d(x, y, 0), width and height = the block's rounded rect (viewport pixels).
- Positions refresh only when something changed: scroll, resize, load, ResizeObserver on every block, transitionend / animationend / toggle outside #deep, document.fonts.ready. All of that only sets a dirty flag; a requestAnimationFrame flush reads all rects first, then writes only slabs that moved or resized. While the lens is closed (depth <= 0.01) nothing is flushed.
- Lazy: layer n wakes up when depth > n - 1.5 AND the block touches the lens circle (layer max radius + 24px). Then the slab gets class is-near (display block) and build() runs (once). If a block changed size, the slab is marked stale and onResize() runs the next time it is near.
- Blueprint: block + up to 40 descendants, 1px white outlines, corner ticks, labels, padding and margin measurement lines, 8px grid background. Node pool per slab (slab._bp).
- Source: real DOM pretty-printed (2 spaces), text/attribute/comment values cut at 60 characters, syntax colors via span.tk-*, plus a "/* computed */" rule from getComputedStyle. 11px/15px JetBrains Mono.

## STEP 5 SPEC (done): real Memory (L3) and real Silicon (L4)
- Memory (memory.js): hex dump of the REAL bytes of block.innerText (UTF-8), 16 bytes per row, 12-digit address, ASCII column, 528px columns, max 320 rows. First line '// 0x00007FF6A000 · block hero · 312 bytes · UTF-8' (stable address from an FNV-1a hash of the block id). Continues with the bytes of block.outerHTML in dim amber. Real image bytes (first 192, Range request, same origin) with signature highlight. CSS-only read head (i.mem-head, --mem-rows).
- Silicon (silicon.js): see step 7 for the current version. Heading mask (Inter 900) drawn big on a tiny offscreen canvas, cells inside bright cyan, outside faint (alpha 0.14); characters are the REAL bits of the block bytes (innerText bytes, then outerHTML, max 8192). Loop runs only while depth > 3.2 and stops completely otherwise. If navigator.hardwareConcurrency <= 4: 10px grid and 30 fps.

## STEP 6 SPEC (done): the opening move, the Human layer, the hum
- Intro (intro.js): once per session (sessionStorage key 'underneath:intro-seen'; ?intro replays). After fonts + 700ms: setAuto(true); lens glides top-right to the hero h1 (1.3s), drills to depth 3.2 over 2.4s, holds 0.5s, rises over 1.3s, setAuto(false). Then showHint() adds class is-visible to .hero__hint. Any pointerdown, real pointermove, keydown, wheel, touchstart or scroll (> 2px) cancels it at once (capture listeners). Reduced motion: no intro, hint shown at once.
- Human (human.js): holding at depth >= 3.98 fills a charge ring (svg.human-charge, 1.4s; drains in 0.35s) then opens section#human.human (role=dialog, aria-modal, made by JS, child of <body>, hidden + aria-hidden while closed). Swells with a clip-path circle (0.9s; reduced motion instant). Body siblings (except #human and #deep) become inert while open. Esc or "Back to the surface" closes it and restores focus. html.human-on stops page scroll. Content: label 'LAYER 5 · HUMAN', then steps fading in one by one (line 1; line 2 + accent dot + Email/GitHub/LinkedIn buttons; line 3; the mono panel 'What this page can already see about you', read live by readDevice(), whose text is kept in one string DEVICE_CODE, shown by the 'Show the code' toggle AND run with new Function). 'Read on your device. Sent nowhere.' No network calls. Sends window event 'underneath:human' { open }.
- Sound (sound.js): button.sound-toggle (OFF by default; AudioContext made on first click), 3 oscillators -> low-pass -> gain; pitch, filter and loudness rise with depth; steady 130.8 Hz in Human; pauses when the tab is hidden.
- Surface contact: main.js adds ul.contact__plain with visible text for each contact link.

## STEP 7 SPEC (done): phones, keyboards, screen readers, speed
- Changed files: lens.js, slabs.js, silicon.js, hud.js, human.js, deep.css, main.js. New: layers-ui.js, perf.js. index.html, content.js, surface.js and the other layer files were not changed.
- Touch (lens.js): long-press 250ms (HOLD_MS_TOUCH) starts the drill. The lens sits 72px above the finger (TOUCH_OFFSET_Y, never above y = 8px). Dragging moves the lens; release springs back. A finger that moves more than 10px before the long-press is a scroll. The non-passive touchmove listener (preventDefault) exists ONLY while a finger drills (blockTouchScroll). CSS: html.deep-on and body touch-action: manipulation; html.is-drilling touch-action: none. Presses on [data-no-lens], .sound-toggle and #human never start a drill.
- Reduced motion (lens.js): lens position, depth and peel change instantly (no spring, no easing). No glow, no intro, instant Human swap.
- Visibility: lens.js releases any hold and stops its loop when the tab is hidden, and restarts when it is visible. perf.js sets html.tab-hidden (CSS pauses every animation). silicon.js and human.js loops stop when hidden. sound.js suspends.
- Peel (lens.js): setPeel(n) (n 1 to 4, 0 = off) grows layer n over the whole screen in 0.45s (instant with reduced motion); the other layers shrink. getPeel() = the peeled layer (stays set while closing). getDepth() = max(real depth, peeled layer), so slabs, hud, silicon, sound and human keep working. #deep gets class is-peeled. In peel, slabs.js builds the layer's slab for EVERY block within 100px of the screen (inView), not only near the lens. The HUD label says "full page" and is pinned top-left (CSS).
- Layers button (layers-ui.js): div.layers[data-no-lens] fixed bottom-right (bottom 72px, z-index 105; the sound button is at bottom 16px, also z-index 105 so both stay above #deep). button.layers__fab (min 44px, aria-expanded, aria-controls=layers-panel; shows the active layer name). div#layers-panel.layers__panel[role=group] with: label + output + input#layers-depth (range 0 to 4, step 0.1), checkbox#layers-peel "Peel the whole page", 5 buttons (Blueprint, Source, Memory, Silicon, Human; aria-pressed; each shows its key), "Back to the surface" (0), a status line and a hint. Slider: opens the lens at the CENTER of the screen (setAuto(true) + moveTo(center) + setDepthTarget(d)); with Peel on it snaps to whole layers and peels. Layer buttons: peel if Peel is on, else lens at depth n; button 5 opens Human. Back to the surface: setPeel(0), setDepthTarget(0), setAuto(false). The panel is NOT a dialog (no focus trap); Esc closes it (first Esc returns to the Surface if a layer is shown).
- Keyboard (layers-ui.js): 1 to 4 = peel that layer, 5 = Human (openHuman), 0 or Esc = Surface. Ignored while typing in text fields, with Ctrl/Alt/Meta, while Human is open (it has its own Esc), and when the event was already handled. Live region: div.layers__live[role=status][aria-live=polite] says 'Layer: Source. Decorative view.' (Surface: 'Layer: Surface. The real page.' Human: 'Layer: Human. Contact links and what this page can see about you.'). A visible badge on the Layers button and the panel status line show the active layer.
- Accessibility: main.js sets aria-hidden="true" and inert on #deep. Human no longer traps Tab (the page behind is inert; Esc always leaves). prefers-contrast: more is handled in deep.css (thicker outlines, stronger text, no faint grid, Silicon canvas brightened with a CSS filter).
- Speed (slabs): .slab uses contain: layout paint. Slabs live in div.deep-inner inside each .deep-layer (made by slabs.js registerLayer).
- Portal fallback (perf.js + deep.css): html.is-portal makes each .deep-layer a small circle div (width/height = 2 x radius, border-radius 50%, overflow hidden, transform translate3d to the lens) and moves .deep-inner the opposite way, so slabs keep viewport coordinates. Each layer has --rr = its own radius variable. Turned on by ?portal, or automatically when FPS (measured over 2s, after a 400ms warm-up) is below 45 while the lens is open; it stays on until reload.
- Silicon (silicon.js): glyph atlas (4 pre-drawn glyphs) instead of fillText; when layer 4 is peeled, the canvas covers the part of the block that is on screen (max 36000 cells, ticks every 440ms). Streaming is OFF (tick stays 0) when navigator.connection.saveData is true, when cores <= 4, or with reduced motion.
- Debug: ?debug shows FPS, depth, holding/free and clip|portal. ?portal forces the portal fallback. ?intro replays the intro.

## FILE TREE
```
underneath/
  index.html
  package.json
  vite.config.js
  PROJECT_STATE.md
  .gitignore                 (made by Vite)
  src/
    main.js
    content.js
    surface.js
    styles/
      tokens.css
      surface.css
      deep.css
    deep/
      lens.js
      hud.js
      slabs.js
      blueprint.js
      source.js
      memory.js
      silicon.js
      intro.js
      human.js
      sound.js
      layers-ui.js
      perf.js
```

## LENS API (src/deep/lens.js, exactly these exports)
- startLens(): finds #deep, adds listeners, adds class deep-on on <html>. Safe to call twice.
- stopLens(): removes listeners, resets radii to 0, removes state classes.
- moveTo(x, y): where the lens should go (viewport pixels). It eases there (instant with reduced motion).
- setDepthTarget(d): 0 to 4. Where depth springs to when the user is NOT holding (default 0).
- setAuto(on): true = ignore pointer and D key. Adds class is-auto on #deep.
- getDepth(): number from 0 to 4. While a layer is peeled, at least that layer number.
- isHolding(): true while the user is drilling (hold passed 200ms mouse / 250ms touch, or D key down).
- onDepth(fn): fn(depth, { x, y, holding, layer }) runs on every frame the lens loop runs. Returns a function that removes the listener. layer = 0 to 4.
- setPeel(n): NEW (step 7). n 1 to 4 = show that layer on the whole screen, 0 = back.
- getPeel(): NEW (step 7). The peeled layer (1 to 4) or 0 (stays set while closing).
The loop (requestAnimationFrame) stops when nothing moves and restarts on input. It does not run while the tab is hidden.

## SLABS API (src/deep/slabs.js, exactly these exports)
- registerLayer(n, { build(slabEl, blockEl, rect), onResize(slabEl, blockEl, rect) }): plug layer n (1 to 4) in. build runs the first time the lens touches the block (or, when the layer is peeled, when the block is on screen). onResize runs when the block changed size after that (if missing, build runs again, so build must be safe to run twice and should reuse its nodes). rect = blockEl.getBoundingClientRect(). Returns a function that unplugs the layer. Do reads first, then writes, and keep slab content inside the slab (positions relative to the block's top-left).
- startSlabs(), stopSlabs(), refreshSlabs() as before.
- Plug-in files export `{ build, onResize }` (named and default). All 4 layers are registered in src/main.js before startSlabs().

## CSS VARIABLES ON #deep (written by lens.js every frame, all in px)
--lx --ly (lens center), --r1 --r2 --r3 --r4 (circle radius of each layer; huge while peeled).
Each .deep-layer also has --rr (its own radius, set in deep.css). Defaults live in deep.css.

## DEEP DOM (index.html) AND CLASSES
- #deep (aria-hidden, inert) > .deep-layer[data-layer=1..4] (each gets one div.deep-inner made by slabs.js, which holds the slabs), .deep-ring[data-ring=1..4], .deep-cursor, .deep-hud (> .deep-hud__text), .deep-meter (> ul.deep-meter__ticks > li.deep-meter__tick > .deep-meter__label + .deep-meter__mark, and p.deep-meter__num), .deep-debug (made by JS with ?debug), svg.human-charge (made by human.js).
- Made by JS: .slab[data-slab-layer][data-slab] (+ .is-near).
  - Layer 1: .bp-box (+ .bp-box--root), .bp-label, .bp-dim (.bp-dim--pad / .bp-dim--mar, .is-v / .is-h, data-v).
  - Layer 2: pre.src-html, pre.src-rule, .src-fade, .src-swatch, syntax classes .tk-tag .tk-attr .tk-str .tk-com .tk-pun .tk-txt .tk-sel .tk-prop .tk-val.
  - Layer 3: i.mem-head, pre.mem-col, span.mem-addr, span.mem-hex, span.mem-asc, span.mem-com, span.mem-dim, b.mem-sig. CSS variable --mem-rows on the slab.
  - Layer 4: canvas.sil-canvas.
- Made by JS in <body>:
  - section#human.human[role=dialog] > .human__top (p.human__label#human-label, button.human__back > span.human__esc) and .human__stage (p.human__line.human__step, div.human__step.human__me (p.human__line + span.human__dot + ul.human__links > li > a.human__btn), p.human__line.human__step, section.human__panel.human__step (h2.human__panel-title, dl.human__facts > div.human__fact > dt + dd, p.human__privacy, button.human__toggle, pre.human__code#human-code)). Class .is-shown on a .human__step shows it.
  - button.sound-toggle (.is-on; svg parts .sound-toggle__waves and .sound-toggle__off).
  - div.layers[data-no-lens] > div#layers-panel.layers__panel (p.layers__title#layers-title, label.layers__label (+ output.layers__out#layers-depth-out), input.layers__range#layers-depth, label.layers__check > input#layers-peel, ul.layers__list > li > button.layers__btn (> kbd.layers__key), button.layers__btn.layers__back, p.layers__status, p.layers__hint) + button.layers__fab (> span.layers__icon, span.layers__fab-text, span.layers__now).
  - div.layers__live[role=status][aria-live=polite] (visually hidden).
- Inside the contact block: ul.contact__plain > li > span.contact__plain-label + a.
- State classes: html.deep-on, html.is-drilling, html.human-on, html.tab-hidden, html.is-portal, #deep.is-open (effective depth above 0.01), #deep.is-pressing, #deep.is-auto, #deep.is-peeled, #deep[data-cursor=on|off], .deep-ring.is-open, .deep-meter__tick.is-active, .deep-hud[data-side=left], .layers__fab.is-active.
- z-index: #deep 100 (above sticky header 20 and skip link 30), .sound-toggle and .layers 105, #human 110. Everything inside #deep has pointer-events none.
- index.html uses HTML entities (&middot; &mdash;) instead of typed special characters.

## WHAT EACH OTHER FILE EXPORTS
- src/deep/hud.js: `startHud()` (HUD text, meter, ?debug panel). Returns a cleanup function.
- src/deep/blueprint.js, source.js, memory.js, silicon.js: `export const <name>` and `export default <name>` = { build, onResize }.
- src/deep/intro.js: `startIntro({ hint })`, `showHint()`.
- src/deep/human.js: `startHuman(content)` (returns stopHuman), `stopHuman()`, `openHuman(x, y)`, `closeHuman()`, `isHumanOpen()`.
- src/deep/sound.js: `startSound(options)` (returns stopSound), `stopSound()`.
- src/deep/layers-ui.js: `startLayersUi()` (returns stopLayersUi), `stopLayersUi()`.
- src/deep/perf.js: `startPerf()` (returns stopPerf), `stopPerf()`, `setPortal(on)`, `isPortal()`.
- src/content.js: `export const content` and `export default content`.
- src/surface.js: `export function renderSurface(root, content)` (unchanged).
- src/main.js: no exports. Imports fonts and CSS, renders the Surface, makes #deep inert, adds the plain contact list (addPlainContact), runs setupReveal(), startLens(), startHud(), registerLayer(1..4), startSlabs(), startHuman(content), startSound(content.sound), startLayersUi(), startPerf(), startIntro({ hint }).
- src/styles/tokens.css: all CSS variables (unchanged).
- vite.config.js: default export, base './'.
- package.json scripts: dev, build, preview, predeploy (runs build), deploy (gh-pages -d dist). For the phone: npm run dev -- --host.

## BLOCKS ON THE SURFACE (data-block ids)
header, hero, about, work-head, work-anchor, work-usbcam, work-underneath, work-placeholder, stack, now, contact, footer.
(section#work itself is not a block. Its heading is block work-head.)

## DONE
- Step 1: Vite project, fonts, scripts, semantic Surface, basic styles.
- Step 2: full editorial Surface design.
- Step 3: the lens.
- Step 4: slabs.js, real Blueprint layer 1, real Source layer 2.
- Step 5: real Memory layer 3 and real Silicon layer 4.
- Step 6: opening move (intro.js), Human layer (human.js), hum (sound.js), plain contact list, hero hint.
- Step 7: touch long-press with the lens above the finger, peel, Layers button + panel, keys 0 to 5 with live region, a11y (inert #deep, no focus trap, prefers-contrast, reduced motion), speed (tab-hidden pause, contain: layout paint, portal fallback, FPS check, saveData / low-core silicon).

## NEXT (step 8)
- Final polish and launch: test on the real phone, fix what the checklist finds, fill the TODO placeholders, move addPlainContact into surface.js, pre-render the Surface HTML at build time (no-JS fallback), add Anchor screenshots, git repo + `npm run deploy` to GitHub Pages.

## TODO (placeholders to fill)
- YOUR_EMAIL_HERE (contact.links Email: href and text)
- YOUR_LINKEDIN_URL_HERE (contact.links LinkedIn: href and text)
- YOUR_CITY_HERE (person.location and contact.text)
- YOUR_ANCHOR_REPO_URL_HERE (work-anchor link)
- YOUR_USBCAM_REPO_URL_HERE (work-usbcam link)
- YOUR_UNDERNEATH_REPO_URL_HERE (work-underneath link)
- YOUR_YEAR_HERE (year of Anchor, USBCam Clone, and the placeholder project; shows as a dash until filled)
- PROJECT_NAME_HERE, YOUR_ONE_LINE_HERE and the text of the placeholder project (work-placeholder)
- Rewrite the case-study text (description + study) in your own words
- GitHub Pages: make a git repo, add a remote, then run `npm run deploy`

## KNOWN ISSUES
- The Surface is built by JavaScript. With JavaScript off, only a short message shows (noscript). Later step: pre-render the HTML at build time.
- Text is about 14:1 on the background, quiet text about 9:1. Accents are still used sparingly: only for the dot, the hover bar, the charge ring and focus outlines, never for text on paper.
- Header shows only 3 links. It may wrap to two lines at about 360px.
- Placeholder labels (coming soon), dashes and the greyed project are visible on the page until filled.
- Lens: the native mouse cursor stays visible when idle (the 10px ring trails it). It is hidden only while drilling.
- Lens: the D key may clash with screen-reader shortcuts. Keys 0 to 5 may clash with screen-reader quick keys in browse mode. The Surface does not need them.
- Lens: the overshoot is a small re-open of layer 1 (about 5px) just after it closes. With reduced motion it is off.
- Lens: after a drill, any click within 400ms is cancelled. A press on a link that lasts over 200ms (touch: 250ms) drills instead of opening it.
- Touch: touch-action is read when the finger lands. Page scrolling is blocked after the long-press only by the non-passive touchmove listener, so a finger that already started scrolling cannot start a drill.
- Layers panel: while a slider or panel layer is on, the lens is in "auto" mode and ignores the mouse until the slider goes to 0, Esc, or "Back to the surface". With Peel on, the slider snaps to whole numbers.
- Layers panel: key 5 and the 5th button open Human, so Human is no longer reachable only by holding.
- Peel: layers 3 and 4 build for every block on screen, which is heavier on big screens (Silicon is capped at 36000 cells and ticks every 440ms).
- Slabs: contain: layout paint clips Blueprint corner ticks and measurement lines that stick out of a slab (decoration only).
- Slabs: LAYER_RADII in slabs.js repeats the max radii of lens.js (170, 125, 85, 50), and silicon.js repeats 50 (MAX_R). human.js repeats 50 (START_R) and 3.98 as the full-depth level. Change them together.
- Slabs: the fade-up reveal moves blocks a few pixels; slabs are corrected when it ends (transitionend), so a drill during the first moments of a reveal can be a few pixels off.
- Blueprint: it draws at most 40 child elements per block, level by level.
- Source: long lines are cropped at the slab edge. Short blocks (like header) show only a few lines.
- Source, Blueprint, Memory and Silicon build once per block and size. If only the text of a block changes (same size), the slab is not rebuilt.
- Memory: columns are 528px; on a phone narrower than that a column is cut at the slab edge. Max 320 rows per slab. Image bytes: untested with real images (no Anchor screenshots yet). Text in a closed <details> is not in the dump.
- Silicon: the heading mask uses Inter; letters are drawn from the block center, so the lens sees only parts of the big letters. Prefers-contrast uses a CSS filter on the canvas.
- Portal fallback: once on, it stays on until reload. The FPS check can also trigger on 30 Hz screens or battery-saver mode (it is only a lighter drawing mode, nothing breaks).
- Intro: needs div.hero__hint (it exists in surface.js). If the hero is not on screen (page restored scrolled down), the intro is skipped and only the hint shows. It is marked "seen" only when it starts.
- Human: the device facts use new Function (the same string is shown on screen). A strict Content-Security-Policy without 'unsafe-eval' would block it; then the panel shows "Device: not available here". GitHub Pages sets no such policy.
- Human: while it is open, the Layers and sound buttons are inert under the dark page.
- Sound: browsers need a click first, so sound is off until the speaker button is pressed. Mobile browsers may keep the hum silent if the phone is on silent.
- Contact: ul.contact__plain is added by main.js and styled in deep.css. Later: move it into surface.js and surface.css.
- Layers panel texts are English strings inside layers-ui.js, not in content.js.