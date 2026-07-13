# Save Status Bar and Auto-Save

The creator page previously had no visible indication of whether the current card was saved, what name it was saved under, or when it was last saved. Users had to remember whether they had saved and which file they were editing. We added a persistent status bar and an always-on auto-save feature to eliminate this friction.

## Decisions

### Always-on auto-save, no toggle

Auto-save is unconditionally enabled for any card that has been named and saved at least once. There is no UI control to disable it. The server is local (started through the desktop launcher), so reliability is not a concern and a toggle would add noise without value.

### First save is intentional

Auto-save does not fire for new cards that have never been saved (`activeCardKey` is `null`). The user must click **Save** in the status bar, which triggers the existing `prompt()` flow to name the card. If the user cancels the prompt, auto-save remains suppressed until they click **Save** again.

### Status bar lives between tabs and content

A thin full-width bar sits between `#creator-menu-tabs` and `#creator-menu-sections`. It is visible on every editing tab and shows the card key (with underscores replaced by spaces) and a save/rename button. Relative timestamps update live ("Saved 14s ago", "Saved 2m ago").

### Rename, not overwrite

After first save, the status bar button says **Rename**. Clicking it triggers a `prompt()` for a new card key. The old save file is left behind; a new file is created under the new key. If the card is dirty when renaming, an immediate save under the old key is forced first, then the rename prompt appears. The button is disabled while any save is in-flight.

### No keyboard shortcut for save

We deliberately do not bind `Ctrl+S` or `Cmd+S`. The status bar button is always visible, and adding a shortcut would blur the line between the intentional first save and the silent auto-save.

### Dirty guard on destructive actions

Importing a real card and loading a saved card both replace the entire in-memory card. If `activeCardKey` is set or the card is dirty, a `confirm()` warns the user that unsaved changes will be lost. A clean new card imports/loads silently.

### Relative time only

The status bar shows how long ago the last save happened (relative). No absolute clock time is shown. The local server makes timezone irrelevant, and relative time is what users expect from modern collaborative tools.

### Single pending save slot

At most one save is in-flight at a time. If the user pauses again while a save is active, the latest snapshot is stashed and fired when the current save finishes. No unbounded queue — this is sufficient because the server is local and synchronous per-request.

### Snapshot-based dirty detection

Dirty state is determined by comparing a JSON snapshot of the card (with image objects stripped, identical to what `saveCard()` serializes) against `lastSavedSnapshot`. The check is debounced off `drawCard()` so it naturally batches rapid edits.
