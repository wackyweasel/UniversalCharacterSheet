# Storage Workspaces

A storage workspace is an isolated collection of characters. The Character List workspace menu can switch between registered workspaces and create new ones.

## Scope

Workspace-specific data:

- Characters and their ordering
- Active character and character mode
- Character timeline events

Shared browser data:

- Built-in and custom themes
- Templates and user presets
- Global settings and timeline display preferences
- Telemetry client identifiers and timestamps
- Per-sheet Build, Play, and Print layout preferences

Copying a character to another workspace creates new character, sheet, widget, group, and card IDs. The visible name and timeline history are retained.

## Providers

### Browser

The Browser workspace uses the existing `ucs:store` and `ucs:timeline` localStorage data. Existing installations require no manual migration.

### Local Directory

A directory workspace owns one `ucs-workspace.json` file in a directory selected through the File System Access API. Directory handles and cached workspace documents are stored in IndexedDB. Forgetting a workspace removes only its browser registration and cache; it does not delete the file.

Permission requests occur only after an explicit user action. If access expires, use **Reconnect directory** and choose the same directory again.

### Google Drive

A Drive workspace is a visible JSON file in the user's Drive. The app requests only the non-sensitive `https://www.googleapis.com/auth/drive.file` scope and can access files created by or explicitly selected for the app. New files carry private application properties so **Connect Google Drive** can discover and register the user's available workspaces on another device. Files created by older versions remain discoverable through their legacy property.

Access tokens remain in memory and expire. Cached Drive workspaces remain editable in IndexedDB while offline or disconnected. Reconnect explicitly to synchronize pending edits.

Files up to 5 MB use a multipart or media upload. Larger files use a resumable upload.

## Conflicts

Directory and Drive saves compare the last known remote fingerprint before overwriting. If another program or device changed the file while this browser has local edits, autosave pauses and presents three choices:

- Load the external version and discard pending local edits
- Keep local changes and explicitly overwrite the external version
- Save local changes as a new directory workspace or Drive file

Malformed files and workspace versions newer than the running application are rejected without being overwritten.

## Browser Support

Workspace controls require all of the following:

- A secure context (`https`, or localhost during development)
- IndexedDB

When these capabilities are absent, all workspace and cross-workspace-copy controls are hidden and the app continues using Browser storage exactly as before. Local-directory controls additionally require the File System Access API `showDirectoryPicker`. Google Drive controls require the deployment variables below, but do not depend on directory-picker support.

## Google Cloud Setup

1. Create or select a Google Cloud project.
2. Enable the Google Drive API and Google Picker API.
3. Configure the OAuth consent screen and declare `https://www.googleapis.com/auth/drive.file`.
4. Create an OAuth 2.0 Web application client.
5. Add authorized JavaScript origins. For development, add `http://localhost:5173`. For GitHub Pages, add the site origin, such as `https://wackyweasel.github.io`. Production and preview paths use the same origin.
6. Create an API key. Restrict it by HTTP referrer to the authorized origins and restrict API access to Google Picker and Google Drive.
7. Find the numeric Cloud project number. This is the Picker App ID.
8. Set the following Vite variables locally or as GitHub Actions repository secrets:

```dotenv
VITE_GOOGLE_CLIENT_ID=example.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=example-restricted-browser-key
VITE_GOOGLE_APP_ID=123456789012
```

These values identify a browser application and are included in the built JavaScript. They are not server secrets. The API key must therefore be protected with referrer and API restrictions. OAuth client secrets and refresh tokens must never be added to this app.