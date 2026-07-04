# JS KNOWLEDGE BASE

## OVERVIEW
All client-side JavaScript for Card Conjurer — 7 root utility/module files + 296 frame pack definitions in `frames/`.

## STRUCTURE
```
js/
├── creator-23.js       # Main creator engine (200KB) — card rendering, canvas ops, UI state
├── main-1.js           # Global utilities: menu toggle, notifications, drag-drop upload, collapsibles
├── themes.js           # Theme persistence, CSS variable updates, rainbow mode
├── themeEditor.js      # Theme editor page controller
├── frameSearch.js      # Frame search/filter logic
├── htmx.min.js         # HTMX library (SPA navigation)
├── qrious.min.js       # QR code generation library
└── frames/             # 296 frame pack definition files
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Card rendering pipeline | `js/creator-23.js` |
| Frame definitions | `js/frames/` |
| Theme/CSS var management | `js/themes.js` |
| Drag-drop image upload | `js/main-1.js` (`uploadFiles`, `dropDrop`) |
| HTMX library file | `js/htmx.min.js` |

## CONVENTIONS
- **Creator architecture**: `creator-23.js` is a 200KB monolithic file managing canvas rendering, UI controls, frame loading, text layout, image compositing, and save/export. Changes require full-file understanding.
- **Theme system**: `themes.js` reads/writes `localStorage['theme']` as JSON, updating CSS custom properties on `:root`. `themeEditor.js` is the separate controller for the theme editor sub-page.
- **No modules**: All JS uses global scope (`var`, `function`, no `import`/`export`). Files loaded via `<script>` tags in order (see root AGENTS.md for HTMX routing).

## ANTI-PATTERNS
- **DO NOT** use `import`/`export` — global scope only, no bundler (see root AGENTS.md for build constraints).
