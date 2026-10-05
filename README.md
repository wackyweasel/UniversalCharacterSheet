# Universal Character Sheet

A TTRPG character sheet application with an infinite canvas and customizable widgets.

## Features

- **Character Management**: Create and manage multiple characters.
- **Storage Workspaces**: Isolate characters in browser storage, a local directory, or Google Drive on supported browsers.
- **Infinite Canvas**: Pan and zoom to organize your sheet however you like.
- **Widget System**: Add Number Trackers, Lists, and Text Areas.
- **Progress Clocks**: Track multiple segmented pie charts with independent labels, counts, and colors.
- **Drag & Drop**: Arrange widgets freely with grid snapping.
- **Old School Style**: Clean, black and white aesthetic.
- **Installable App**: Install from a supported browser and keep working with cached sheets while offline.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown (usually `http://localhost:5173`).

Google Drive workspaces require local environment configuration. See [docs/workspaces.md](docs/workspaces.md) for browser support, storage behavior, and Google Cloud setup.

## Controls

- **Pan**: Middle Click (Mouse Wheel) or Space + Left Click & Drag.
- **Zoom**: Ctrl + Mouse Wheel.
- **Move Widget**: Drag the top handle of any widget.
- **Delete Widget**: Hover over a widget and click the '×' in the top right.

## Progress Clocks

Add **Progress clocks** from the Character Info section of the toolbox. Inspired by the [Blades in the Dark progress clocks](https://bladesinthedark.com/progress-clocks), each clock accepts a positive whole-number segment count, including one. Labels are optional; filled wedges use the theme highlight unless you choose a custom color for that clock.

In Play mode, click or tap anywhere on a chart to add one filled segment. After full, the next click returns it to empty. Hold a mouse press for 300 ms, or drag with touch, to adjust the value: right/up increases and left/down decreases. Dragging wraps in both directions. Release to save; Escape, a cancelled gesture, or a two-finger pinch discards the unfinished adjustment.

The header's + button adds clocks, and its - button lets you choose clocks to remove. These controls are available in Build and Play, beside the editor button. The editor also supports adding, deleting, and reordering clocks; horizontal (wrapping) or vertical arrangement; chart size; labels above or below; a filled/total counter; starting point; and clockwise or counterclockwise fill. Resize the widget to make room for more clocks. Arrow keys adjust a focused chart, Space/Enter advance it, and Home/End set it empty/full. Chart values are read-only in Build, preview, print, and locked widgets.

Each clock's **Segments** and **Filled** fields support variable labels and formulas through the editor's tag and fx controls. For example, label Segments as `research_total` and set Filled to `@research_total / 2`. Other widgets can reference either label. Computed values are rounded down to whole numbers; Segments is at least one, and Filled stays between zero and Segments. Broken formulas retain the last valid value. A formula on Filled disables manual chart clicks and drags until the formula is cleared.
