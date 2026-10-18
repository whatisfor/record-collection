# The Wall — My Record Collection

An interactive vinyl record wall: tilted sleeves stacked in diagonal rows,
featured albums layered in 3D that slide out of the stack, and a detail panel
with tracklists — followed by three scroll sections (taste, artists, quiz).

**Single lightweight page.** No frameworks and no build step. Icons and grain
are inline SVG data URIs. The 24 album covers are real artwork loaded from the
Cover Art Archive; if one fails to load, a tinted sleeve with the album title
takes its place (with one automatic retry first).

```
public/
  index.html   # wall, 4 featured albums, detail panel, 3 scroll sections
  styles.css   # all styling, 3D transforms, checklists, animation
  script.js    # selection, cycling, covers, checklists, quiz, gear sound
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

### Album covers

Every sleeve and featured card carries a real cover image from
`coverartarchive.org/release-group/{mbid}/front-250`. The image is absolutely
positioned and `object-fit: cover`, so every cover renders the same square even
when the source art is a different ratio. Titles sit on a bottom scrim to stay
legible over any artwork.

Because Cover Art Archive redirects to archive.org (which occasionally 500s a
first request), a failed load retries once after a second via a probe request.
If that also fails, JS adds `.no-cover` to the parent, which hides the `<img>`
and reveals the tinted sleeve and album title already present in the markup —
so the layout never breaks.

### Scroll sections

Below the stage, three sections run on native checkboxes and radios (with
`.vh` visually-hidden inputs, so they stay keyboard-operable):

| Section | Control | Behaviour |
|---|---|---|
| A · Your taste in music | 8 genre checkboxes | toggles + live "n of 8" count |
| B · Favorite artists | 8 artist checkboxes | multi-select + live count |
| C · Quick quiz | 3 × 3 radio groups | result card appears only once all 3 are answered |

Checked states are styled by `:has(input:checked)` **and** a JS-toggled
`.is-on` class (the class guarantees the highlight even where `:has()` isn't
honoured in the cascade). The quiz scores each answer toward the same eight
genres used in Section A and shows the winner with a note.

### Turning gears

Off by default (browsers require a user gesture for audio). The **Gears**
button creates an `AudioContext` and fills a 4-second looping buffer with a
soft gear-train whir plus two meshing wheels — a 10-teeth/s main wheel and a
quieter 25-teeth/s pinion — each tooth a short inharmonic metallic ping with
random variance, and the whole thing wobbling once per revolution. Teeth are
spaced evenly across the buffer so the loop seam never clips, and the result
runs through a highpass → lowpass → gain chain. The context is closed on
`pagehide`.

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
