# Universal Character Sheet

A TTRPG character sheet application with an infinite canvas and customizable widgets.

## Features

- **Character Management**: Create and manage multiple characters.
- **Storage Workspaces**: Isolate characters in browser storage, a local directory, or Google Drive on supported browsers.
- **Infinite Canvas**: Pan and zoom to organize your sheet however you like.
- **Widget System**: Add Number Trackers, Lists, and Text Areas.
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
