# Card Conjurer Domain Glossary

Terms used in the codebase and architecture discussions.

## Card

**Card** — The in-memory representation of a custom Magic: The Gathering card
being created. Composed of frame images, text areas, art, set symbol, watermark,
and collector info. Serialized to JSON for server-side persistence.
_Avoid_: project, document

**Card Key** — The user-chosen name for a saved card, sanitized into a filename
for server-side storage. Displayed in the save-status bar and used as the target
for auto-save. `null` when the card has never been saved.
_Avoid_: filename, save name

## Modules

**Text Renderer** — The module responsible for laying out and drawing card text,
mana symbols, and text codes onto a canvas. Lives in `js/modules/text-renderer.js`
and exposes a single `writeText(textObject, targetContext)` method through
`createTextRenderer(options)`. `cardStorage` — The server-backed persistence
layer for saving and loading cards as JSON files in `saved_cards/`. Lives in
`js/modules/card-storage.js` and exposes `saveCard`, `loadCard`, and `listCards`.
