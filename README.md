# My Record Collection

A static showcase page for a vinyl collection. **Pure HTML + CSS** — no
JavaScript, no frameworks, no build step, no external assets.

## Structure

```
public/
  index.html   # hero, 9 record cards, footer
  styles.css   # all styling and animation
  404.html     # served for unknown routes
wrangler.jsonc # Cloudflare Workers static-assets config
```

## Run locally

```sh
npx --yes serve public
```

## Deploy

```sh
npx wrangler deploy
```

## How the cards work

Each card sets three custom properties inline:

```html
<article class="card" style="--a:#7a4526; --b:#241408; --label:#e8b04b;">
```

| Property | Purpose |
|---|---|
| `--a` | cover gradient top colour |
| `--b` | cover gradient bottom colour |
| `--label` | centre label colour on the vinyl disc |

The record sits behind the sleeve at `z-index: 1`. On `:hover` it slides out
via `transform: translateX(38%)` on the wrapper while the inner `.vinyl__disc`
rotates — splitting translation and rotation across two elements so the
animation doesn't overwrite the offset.

## Adding a record

Copy any `<article class="card">` block, then update:

- the monogram in `cover__mark`
- `card__title`, `card__artist`
- `year` and `genre`
- the three inline colour custom properties

Bump the "Nine records" line in `.collection__count` if you change the count.

## Motion

All spinning elements stop under `prefers-reduced-motion: reduce`.
