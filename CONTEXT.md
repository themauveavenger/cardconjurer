# Card Conjurer Domain Glossary

Terms used in the codebase and architecture discussions.

## Modules

**Text Renderer** — The module responsible for laying out and drawing card text,
mana symbols, and text codes onto a canvas. Lives in `js/modules/text-renderer.js`
and exposes a single `writeText(textObject, targetContext)` method through
`createTextRenderer(options)`.
