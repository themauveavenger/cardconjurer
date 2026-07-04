# PROJECT KNOWLEDGE BASE

## OVERVIEW
Card Conjurer — custom Magic: The Gathering card creator. Static HTML/CSS/JS web app served via nginx (Docker) or Apache. SPA navigation via HTMX. 3000+ image assets, 296 frame definition JS files.

## STRUCTURE
```
.
├── about/          # About page
├── askurza/        # "Ask Urza 2.0" card search tool
├── converter/      # MTG set converter tool
├── core/           # Favicons, manifest, sitemap, 404 page
├── creator/        # Card creator page
├── css/            # reset.css + style-9.css
├── data/           # Fonts, scripts, palettes, images, styles
├── fonts/          # 41 TTF/OTF font files
├── gallery/        # Gallery page + rendered card images
├── globalHTML/     # Shared HTML fragments
├── img/            # All image assets (frames, mana symbols, etc.)
├── js/             # Client-side JS (7 root files + 296 frame defs)
│   └── frames/     # Frame pack definitions (one per card frame style)
├── legal/          # Legal page
├── local_art/      # User local art directory (gitignored)
├── phyrexian/      # Phyrexian text generator
├── print/          # Printing tool page
├── theme/          # Theme editor page
├── tutorial/       # Tutorial page
├── app.conf        # nginx config
├── Dockerfile      # Docker build (nginx:1.21-alpine)
├── launcher.py     # Desktop launcher
├── Makefile        # make start → docker build + run
├── .htaccess       # Apache caching rules
├── index.html      # Main SPA entry
└── README.md
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Main entry / routing | index.html | HTMX-based SPA; each sub-page is its own index.html |
| Card rendering logic | js/creator-23.js | 200KB, main creator engine |
| Frame packs | js/frames/ | 296 files, one per frame style |
| Theme system | js/themes.js | CSS variable-based, persisted in localStorage |
| Palettes | data/scripts/palettes/ | 7 palette JS files (darkMode, lightMode, etc.) |
| Utilities | data/scripts/ | animations, localStorage helpers, sortable |
| Styles | css/ | reset.css + main style-9.css |
| Static assets | img/ | 60+ frame style dirs, mana symbols, set symbols |
| Fonts | data/fonts/ | MTG fonts (beleren, matrix, mplantin, phyrexian) |
| CI/CD | .github/workflows/publish.yaml | S3 sync to cardconjurer.app on master push |
| Docker config | app.conf, Dockerfile | nginx:1.21-alpine, port 4242 |
| Desktop launcher | launcher.py | PyInstaller-based local server launcher |

## CONVENTIONS
- **Frame packs**: Each `js/frames/pack*.js` file defines an `availableFrames` array of `{name, src, masks}` objects. Group files (`group*.js`) call `loadFramePacks()` with categorized frame lists.
- **HTMX navigation**: Sub-pages loaded into `#content` div via `hx-get`. Each subdirectory has its own `index.html` that works as a standalone page.
- **Theme persistence**: Themes stored as JSON in `localStorage`, applied via CSS custom properties on `:root`.
- **Image assets**: PNG/SVG frame parts in `img/frames/<style>/`. Mana symbols in `img/manaSymbols/<style>/`. Set symbols in `img/setSymbols/<official|custom>/`.
- **Local art**: Place images in `local_art/`, reference by filename in the URL field.
- **File naming**: Numbered suffixes for versioned JS (main-1.js, creator-23.js, style-9.css).

## ANTI-PATTERNS
- **DO NOT** edit `launcher.exe`, `launcher-linux`, `launcher-macos` — these are PyInstaller builds of `launcher.py`.
- **DO NOT** commit large binary assets to `local_art/` — it's in `.gitignore`.
- **No build step** — this is vanilla JS, no bundler, no TypeScript, no npm.
- **No tests** — no test framework, no test files.

## COMMANDS
| Task | Command | Notes |
|------|---------|-------|
| Start dev server (Docker) | `make start` | Builds + runs on port 4242 |
| Start dev server (Python) | `python launcher.py` | Lightweight local server |
| Sync to production | git push to master | GitHub Actions → S3 |

## NOTES
- CORS disabled in `.htaccess` (commented out). S3 bucket serves the app directly.
- Apache caching: images cached 1y, CSS 31d, JS 1d (commented values in .htaccess).
- nginx caching: CSS/JS 1y, HTML/JSON no cache.
- The `data/` directory contains both runtime assets (fonts, images) and JS utilities (scripts/).
