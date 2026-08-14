# Universal Character Sheet

A TTRPG character sheet application with an infinite canvas and customizable widgets.

## Features

- **Character Management**: Create and manage multiple characters.
- **Infinite Canvas**: Pan and zoom to organize your sheet however you like.
- **Widget System**: Add Number Trackers, Lists, and Text Areas.
- **Drag & Drop**: Arrange widgets freely with grid snapping.
- **Old School Style**: Clean, black and white aesthetic.
- **Installable App**: Install from a supported browser and keep working with cached sheets while offline.

## Installed App Storage

The installed app uses a separate on-device workspace. On its first launch it copies the website's current characters and custom content, but later changes do not sync between the website and installed app.

Use **Backup** on the character list to move or protect data. The installed backup dialog can also replace the installed workspace with a fresh one-way copy from the website without changing the website's data.

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

## Controls

- **Pan**: Middle Click (Mouse Wheel) or Space + Left Click & Drag.
- **Zoom**: Ctrl + Mouse Wheel.
- **Move Widget**: Drag the top handle of any widget.
- **Delete Widget**: Hover over a widget and click the '×' in the top right.
