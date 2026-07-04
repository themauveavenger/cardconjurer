# Handoff: local_art file browser & Scryfall set symbols

**Date**: 2026-07-03
**Project**: Card Conjurer (`/home/josh/Code/cardconjurer`)
**Status**: Planning complete — no code changed yet

## What we want

Two improvements to the card creator:

1. **local_art/ file browser** — Present a dropdown list of files in `local_art/` so users don't have to manually type filenames in the "Via URL" field
2. **Switch Gatherer → Scryfall for set symbols** — The Gatherer API (`gatherer.wizards.com`) frequently fails. Scryfall's `/sets/:code` endpoint returns an `icon_svg_uri` with an SVG of the set symbol

## Files that need changes

| File | Purpose |
|------|---------|
| `creator/index.html` | Add Scryfall option to set-symbol-source dropdown; add `<select>` for local_art files near Art tab "Via URL"; fix Art tab to use `imageURL()` |
| `js/creator-23.js` | Add Scryfall branch to `fetchSetSymbol()`; add `loadLocalArtList()` function; fix art "Via URL" wiring |
| `app.conf` | Enable `autoindex on` for `/local_art/` location (nginx/Docker) |
| `launcher.py` | Optionally add `/api/local-art` JSON endpoint for Python dev server |

---

## Feature 1: local_art/ file browser

### Current behavior quirk discovered

The Art tab's "Via URL" input (line 305 of `creator/index.html`) calls `uploadArt()` **directly** — it does NOT go through `imageURL()`. This means the `/local_art/` auto-prefix only works for frames, set symbols, and watermarks (which use `imageURL()`), but NOT for art. The README's claim of "type `my_art.jpg` in the Via URL box" only works for those other tabs.

### Fix: Art tab wiring

Change line ~305 in `creator/index.html` from:
```html
onchange='uploadArt(this.value, ...)'
```
to:
```html
onchange='imageURL(this.value, uploadArt, ...)'
```
This routes through `imageURL()` (line 5255 of `creator-23.js`), which prepends `/local_art/` when the value doesn't contain `http`.

### File listing approach

Since this is a static HTML/JS site with no backend, we need the server to provide a directory listing. Three options depending on server:

| Server | Approach |
|--------|----------|
| **nginx (Docker)** | Enable `autoindex on` in `app.conf`, JS fetches `/local_art/`, parses HTML `<a>` tags |
| **Python (launcher.py)** | Override `do_GET` to return JSON at `/api/local-art` |
| **Apache** | Enable `Options +Indexes` in `.htaccess` |

### Client-side JS: `loadLocalArtList()`

New function in `creator-23.js`:
1. Try `fetch('/api/local-art')` first (JSON — Python server)
2. Fall back to `fetch('/local_art/')`, parse HTML (nginx autoindex)
3. Filter to image extensions: `.png, .jpg, .jpeg, .svg, .webp, .bmp, .gif`
4. Populate a new `<select id="local-art-select">` dropdown
5. On select change → fills the "Via URL" input and triggers `imageURL()`

### UI addition (in `creator/index.html`, Art tab section)

Below the existing "Via URL" input (around line 305), add:
```html
<h5 class='padding margin-bottom input-description'>Or choose from local_art/</h5>
<select id='local-art-select' class='input margin-bottom' onchange='selectLocalArt(this.value);'>
  <option value='' disabled selected>Choose a file...</option>
</select>
```

### nginx config change (app.conf)

Add before the catch-all location block:
```nginx
location /local_art/ {
    autoindex on;
}
```

---

## Feature 2: Scryfall set symbols

### What Scryfall provides

`GET https://api.scryfall.com/sets/:code` returns a set object with `icon_svg_uri` — a monochrome (black `#000`) SVG of the set symbol, hosted at `svgs.scryfall.io`. Example SVG for WAR:

```xml
<svg viewBox="0 0 191 227" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" fill-rule="evenodd">
    <g fill="#000" fill-rule="nonzero">...</g>
  </g>
</svg>
```

This field is present on all sets tested (WAR, SLD, LEA, AER). SLD uses a generic star icon.

### Key difference from Gatherer/Hexproof

Scryfall's SVGs are **monochrome (black only)**. Gatherer and Hexproof provide **rarity-colored** symbols (common=black, uncommon=silver, rare=gold, mythic=orange). The code currently uses rarity-colored symbols.

### Rarity coloring: two approaches

**Approach A — Simpler (recommended first pass)**:
Use the monochrome SVG as-is. Add a note in the UI that Scryfall symbols aren't rarity-colored. Quick to implement.

**Approach B — Full (can be added later)**:
Fetch the SVG text via XHR, parse with `DOMParser`, walk the DOM replacing `fill` attributes based on rarity, serialize back, create a `data:image/svg+xml` URI, and load as set symbol.

Rarity → color mapping:
```
common (c)   → #1a1718 (black)
uncommon (u) → #7e8c8d (silver)
rare (r)     → #b89130 (gold)
mythic (m)   → #d45b12 (orange-red)
```

### Code changes needed

**1. `creator/index.html`** — Add option to set-symbol-source dropdown (around line 371):
```html
<option value='scryfall'>Scryfall</option>
```

**2. `js/creator-23.js`, `fetchSetSymbol()` (line 4302)** — Add new branch before the final `else`:
```js
} else if (document.querySelector("#set-symbol-source").value == 'scryfall') {
    fetchScryfallSetSymbol(setCode, setRarity);
```

**3. New function `fetchScryfallSetSymbol(code, rarity)`**:
- Fetches `https://api.scryfall.com/sets/:code`
- Extracts `icon_svg_uri` from response
- (Approach A) Calls `uploadSetSymbol(icon_svg_uri, 'resetSetSymbol')` directly
- (Approach B) Fetches SVG text, recolors by rarity, creates data URI, then uploads

### Concerns

- **Scryfall advises against hotlinking** their SVGs (URLs may change). For a local tool this is acceptable but worth noting.
- **CORS**: Scryfall's API and CDN (`svgs.scryfall.io`) should be CORS-friendly; this is a public API used by many tools.
- **Old Gatherer aliases** in `setSymbolAliases` map (line 316) may not apply to Scryfall — Scryfall uses standard set codes.
- **Custom/special sets** (SLD, A22, A23, J22, CC, logan, joe) should still bypass all APIs and use local PNGs — the code already handles this at the top of `fetchSetSymbol()`.

---

## Suggested skills

- `librarian` — for researching Scryfall API internals or SVG manipulation patterns if needed during implementation
- `conventional-commit` — for structured commit messages when implementing

## Conversation context

The user originally asked about known quirks with Card Conjurer. We identified:
- **5MB localStorage limit** for card saves (embedded base64 images eat space)
- **local_art/ directory workaround**: put images there, reference by filename
- **Art tab "Via URL" doesn't go through `imageURL()`** (discovered bug)
- **Gatherer API often fails** for set symbols
- Must credit artist before downloading
- `fixUri()` Google Storage prefix is disabled (local version)

These two features were requested as improvements. The user wants a plan first, then implementation after review. No code has been changed yet.
