# FRAMES KNOWLEDGE BASE

## OVERVIEW
296 frame pack definition files — each `pack*.js` defines available card frames for a specific MTG card frame style. `group*.js` files organize packs into categorized lists for the UI. `version*.js` files handle set-specific rendering variants.

## STRUCTURE
```
frames/
├── pack*.js               # 260 files — define availableFrames[]
├── group*.js              # 15 files — call loadFramePacks([...categorized...])
├── manaSymbol*.js         # 13 files — define mana symbol frame collections
├── version*.js            # 7 files — set-specific rendering (planeswalker, saga, dungeon, etc.)
├── versionClass.js        # Class frame rendering
└── versionQRCode.js       # QR code integration
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Add a new frame style | Create a new `pack*.js` file with `availableFrames = [...]` |
| Categorize frames in UI | Edit `group*.js` to add pack to `loadFramePacks()` |
| Set-specific rendering overrides | `version*.js` files (planeswalker, saga, etc.) |
| Mana symbol variation | `manaSymbol*.js` files |

## CONVENTIONS
See root AGENTS.md for the pack/group file pattern. Additional details specific to frame files:
- **Bounds**: Packs optionally define `bounds = {x, y, width, height}` (normalized 0-1 coordinates) for text area positioning.
- **Masks pattern**: Common to define `masks` (full card layers) and `masks2` (simplified subsets) — both arrays of `{src, name}` referencing image parts in `img/frames/<style>/`.
- **Group file structure**: The `value` field in `loadFramePacks()` acts as a key matching a pack concept. Use `value: 'disabled'` to insert section headers.
- **File naming**: Pack files prefixed by set/expansion name (`pack8th.js`, `packM15.js`). Group files prefixed by category (`groupStandard-3.js`, `groupShowcase-5.js`).

## ANTI-PATTERNS
- **DO NOT** mutate `availableFrames` after declaration — it's read once during creator initialization.
- **DO NOT** use `import`/`export` — no bundler, global scope only.
