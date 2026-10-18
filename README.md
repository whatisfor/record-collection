# The Wall — My Record Collection

An interactive vinyl record wall: tilted sleeves stacked in diagonal rows,
featured albums layered in 3D that slide out of the stack, and a detail panel
with tracklists.

**Single lightweight page.** No frameworks, no build step, no external assets
(icons and grain are inline SVG data URIs).

```
public/
  index.html   # wall, 4 featured albums, detail panel, tracklists
  styles.css   # all styling, 3D transforms, animation
  script.js    # ~7 KB: selection, cycling, optional Web Audio crackle
  404.html
wrangler.jsonc
```

## Run locally

```sh
npx --yes serve public
```

## Deploy

```sh
npx wrangler deploy
```

## How it works

### Layering

| Layer | z-index | Contents |
|---|---|---|
| `.lights` | 0 | fixed warm spotlight cones |
| `.wall` | 1 | 20 decorative sleeves, 4 rows, rotated −5° |
| `.featured` | 20 | the 4 interactive albums (`preserve-3d`) |
| hover / arrows | 70 | side arrow buttons |
| `.detail` | 80 | tracklist panel |
| `.grain` | 9998 | animated film grain |

The stage sets `perspective: 1500px`; `.featured` sets
`transform-style: preserve-3d`, so each card's `translateZ` is real depth.

### Diagonal rows top-left → bottom-right

```css
.wall__row { margin-left: calc(var(--r) * 7vw); }   /* each row steps right */
.wall__row + .wall__row { margin-top: -30px; }       /* rows overlap        */
.sleeve { margin-left: -46px; }                      /* sleeves overlap     */
z-index: var(--r);                                   /* lower rows in front */
```

### Featured cascade

Each card carries `--i` (0–3), which drives its offset from centre:

```css
translate(calc((var(--i) - 1.5) * 11vw), calc((var(--i) - 1.5) * 7vh))
```

`slideOut` animates them out of the stack one at a time via
`animation-delay: calc(var(--i) * .16s)`.

### Interaction states

| State | Trigger | Effect |
|---|---|---|
| hover | `.rec:hover:not(.is-active)` | lifts −30px, `translateZ(95px)`, disc spins + emerges |
| active | `.rec.is-active` | centres, `translateZ(240px)`, `scale(1.16)` |
| faded back | `.featured.has-active .rec:not(.is-active)` | `opacity .34`, `blur(1.4px)`, pushed to `translateZ(-130px)` |

### Content lives in HTML

Album metadata is in `data-title` / `data-artist` / `data-year` / `data-genre`
on each card; tracklists sit inside an inert `<template class="rec__tracks">`.
`script.js` reads both — nothing is hard-coded in JavaScript.

### Vinyl crackle

Off by default (browsers require a user gesture for audio). The **Crackle**
button creates an `AudioContext`, fills a 4-second buffer with low-level
surface noise plus sparse decaying pops, and runs it through a highpass →
lowpass → gain chain. The context is closed on `pagehide`.

## Adding an album

1. Copy an `<article class="rec">` block and bump `--i`.
2. Set `--a`, `--b`, `--label`, `--rot`, and the `data-*` attributes.
3. Add its tracklist inside the card's `<template>`.
4. Add a matching `<button class="dot">` in `#dots`.

Note `--i` must stay contiguous from 0 — it drives both cascade position and
entrance stagger.

## Motion

Everything animation-related stops under `prefers-reduced-motion: reduce`,
including the film grain and the disc spin.
