---
name: add-preset
description: 'Add a community-gallery character preset from pasted data. Use when the user asks to "add a preset" and pastes a tab-separated line: name, author, description, JSON payload (ending with the game system). Creates the preset file(s) in public/community-gallery/presets and registers them in index.json, producing an English + original-language pair when the content is not in English.'
---

# Add a preset to the community gallery

## Input format

One tab-separated line (usually a pasted attachment), in this order:

1. **Name** of the preset
2. **Author** (no `@` in the paste)
3. **Description**
4. **JSON payload** (a full character object; `"gameSystem"` is the last key)
5. Trailing date / empty tabs: ignore

Example: `OUaE ver0.1 <TAB> krnlgc <TAB> Private DC Campaign Character Sheet <TAB> {"name":"New Character",...,"gameSystem":"Once Upon an Eternity"} <TAB> 26/10/2026 ...`

## Rules

- **Author**: prepend `@` (`krnlgc` -> `@krnlgc`; never double it).
- **Name**: the entry name and the JSON's top-level `"name"` are both set to the preset name (the pasted JSON usually has `"New Character"`).
- **Game system**: taken from the payload's `gameSystem`; used unchanged in the index entry.
- **Language**: judge it from the text content in the JSON (labels, item names, table headers, rich text), not from the name/description alone.
  - English: one preset.
  - Not English: **two** presets.
    - English version: all user-visible text translated, plain name (no suffix).
    - Original version: payload untouched, name gets ` (Language)` appended, using the English language name, e.g. `Deadlock HB (Russian)`.
    - Both share author and gameSystem. The English entry gets an English description (translate it if needed); the original keeps the description as pasted.
- Files go in `public/community-gallery/presets/` as a single-line minified UTF-8 JSON file with no trailing newline. Name = snake_case of the preset name (`deadlock_hb.json`); the original-language file adds `_<language>` (`deadlock_hb_russian.json`).
- `public/community-gallery/index.json` gets a new entry at the end of the `presets` array (before `"themes"`) with the next sequential string id, keys in order `id, name, author, description, file, gameSystem`. English entry first, then the original-language one.
- Do not touch theme, widget ids, colours, or any structural/enum value when translating; only human-readable text.

## Workflow

Use the helper [preset_tool.py](./preset_tool.py) (Python 3, run from the repo root). If the paste isn't already a file/attachment, save it with the `create` tool to the session `files/` folder first. Always pass the path to that file.

1. `python .github/skills/add-preset/preset_tool.py parse <input>` - check name, author (already `@`-prefixed), description, gameSystem.
2. `python .github/skills/add-preset/preset_tool.py strings <input>` - lists unique translatable strings. Decide the language from them.
3. **English content**: `python .github/skills/add-preset/preset_tool.py add <input>`
4. **Non-English content**:
   1. Create `translations.json` in the session `files/` folder: `{"description": "<English description>", "values": {"<original string>": "<English string>", ...}}`. Include every string from step 2 that is real text (the tool only touches text fields; enum/style/colour values are skipped automatically). Keep rich-text HTML tags intact and translate the whole string.
   2. `python .github/skills/add-preset/preset_tool.py add <input> --translations <translations.json> --language <EnglishLanguageName>`
   3. If it reports untranslated strings, add them to the map and re-run with `--force` (the index entries are not duplicated).
5. Verify: `git --no-pager diff --stat -- public/community-gallery` and that `index.json` parses; spot-check the new entries. The dev server serves the gallery from `public/`, so the preset should appear in the Presets gallery.
6. **Stop before committing/pushing**: show the user the summary and ask first (never `git commit`/`git push` unprompted). Commit style used in this repo: `feat: add <Name> character sheet` with the Co-authored-by trailer.
