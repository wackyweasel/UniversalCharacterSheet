# Universal Character Sheet

A TTRPG character sheet application with an infinite canvas and customizable widgets.

## Features

- **Character Management**: Create and manage multiple characters.
- **Storage Workspaces**: Isolate characters in browser storage, a local directory, or Google Drive on supported browsers.
- **Infinite Canvas**: Pan and zoom to organize your sheet however you like.
- **Widget System**: Add Number Trackers, Lists, and Text Areas.
- **Automations**: Effects add bonuses or penalties to numeric values, including formula results. Formulas stay unchanged, and downstream formulas and Events use the final adjusted values. Value limits still apply unless an Effect allows exceeding them; removing the Effect restores the latest formula result. Circular Effect activation dependencies are rejected. Widget and group templates preserve internal Effect targets and save underlying values without baking in bonuses.
- **Guided Tutorials**: Start with the Automations overview, continue with Formulas (expressions, tables and inline text) or Events (triggers, conditions and actions), and explore storage, sharing and layouts in Various. Compendium walks through creating an item with Effects, equipping a copy and transferring your catalog.
- **Event Dice Rolls**: All dice in an expression (such as `8d6` or `2d6 + 1d8`) roll together. Rolls in later event steps wait for earlier results.
- **Drag & Drop**: Arrange widgets freely with grid snapping.
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
