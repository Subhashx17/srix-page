# UNDERNEATH

A layered portfolio by Nizampuram Srivardhan (srix). The page is only the top layer. A glass lens follows your cursor. Press and hold, and the page opens underneath it.

Live: https://nizampuram-srix.github.io/underneath/

## Run it

```powershell
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # open it on your phone too
npm run build          # makes the dist folder
npm run deploy         # builds and publishes to GitHub Pages (gh-pages branch)
```

Handy URL flags: `?debug` (FPS panel), `?intro` (replay the intro), `?portal` (light drawing mode), `?og` (screenshot mode).

## How the layers work

1. **Surface** is the real page: plain HTML, keyboard and screen reader friendly.
2. **Blueprint and Source** are built live from the real block under the lens: its boxes and measurements, then its real HTML and CSS.
3. **Memory** shows the real bytes of the block's text as an amber hex dump.
4. **Silicon** draws the same bytes as real zeros and ones inside the big letters.
5. **Human** opens when you keep holding at full depth (or press 5): contact links and what the page can see about you, read on your device and sent nowhere.

Keys: `D` (hold) to drill, `1` to `4` to peel a layer, `5` for Human, `0` or `Esc` for the Surface.

## Credits

- Original design and code by Nizampuram Srivardhan, built with the help of Claude (Anthropic).
- Fonts via Fontsource (open license): Instrument Serif, Inter, JetBrains Mono.
- Built with Vite. Published with gh-pages on GitHub Pages.