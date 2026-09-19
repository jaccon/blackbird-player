---
title: 'Plugin System & YouTube Converter Plugin (MP3/MP4)'
type: 'feature'
created: '2026-09-19T14:18:00-03:00'
baseline_commit: '855d67f035bd47cfd1987bb5458ec1aa04afe268'
status: 'done'
context:
  - 'ai/architecture.md'
  - '.agent-instructions/project-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** BlackBird Media Player currently has a fixed set of views without an extensibility mechanism for third-party or custom add-ons, and lacks the ability to download and convert YouTube media into offline MP3 audio or MP4 video files directly inside the player.

**Approach:** Build a modular Plugin Architecture featuring a "Plugins" navigation entry, SQLite-backed plugin lifecycle management (install from web ZIP/local ZIP, enable/disable, delete), dynamic DOM-based plugin UI mounting, and a bundled YouTube Converter plugin leveraging `yt-dlp` to convert and import media into the BlackBird library.

## Boundaries & Constraints

**Always:**
- Maintain Electron security boundaries (`contextBridge` in preload, no raw Node.js modules in renderer).
- Adhere to the Repository/DAO pattern in `src/main/database.ts` for plugin persistence.
- Sanitize all extracted ZIP file paths against Zip-Slip path traversal attacks.
- Standardize on English language for all source code, comments, and identifiers.
- Provide strict TypeScript types for all IPC calls and data structures (avoid `any`).
- Prevent blocking the main Electron event loop during ZIP downloads or `yt-dlp` conversion execution.

**Ask First:**
- Adding external CLI tools to the build package that are not already present on the user system.
- Modifying default audio output or core audio playback engine outside the plugin container.

**Never:**
- Never expose `child_process` or `fs` directly to the renderer context.
- Never write plugin files outside the dedicated `~/BlackBird/plugins` directory.
- Never allow disabled plugins to mount or execute code in the player DOM.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Install Plugin via Web ZIP | Valid URL pointing to `.zip` containing `manifest.json` | ZIP downloaded, validated, extracted to `~/BlackBird/plugins/<id>`, registered in SQLite, displayed in UI | Report invalid URL, network timeout, or invalid ZIP structure to UI with clean error toast |
| Install Plugin with Malicious ZIP | ZIP containing path traversal (e.g. `../../evil`) | Installation aborted immediately, no files written outside destination | Throw error "Invalid entry path in archive", abort transaction |
| Install Plugin Missing Manifest | ZIP without valid `manifest.json` | Installation rejected; temporary directory cleaned up | Return `{ error: 'manifest.json missing or invalid' }` |
| Toggle Plugin Enabled/Disabled | User clicks toggle switch on plugin card | Status toggled in SQLite (`enabled: 0/1`); UI updates immediately; active plugin menu/tab visibility updated | Graceful error alert if database update fails |
| Delete Plugin | User clicks delete button on plugin card | Directory deleted from disk, record removed from SQLite, UI refreshed | Error feedback if directory is locked or deletion fails |
| Mount Plugin UI | User clicks "Open" on an active plugin | View switches to plugin screen, plugin container cleared, plugin script mounts UI inside DOM | If script fails to load, display fallback error view with retry button |
| Convert YouTube to MP3 | Valid YouTube URL, format `mp3` | `yt-dlp` downloads audio, extracts MP3, tags metadata, auto-imports into BlackBird library via `upsertTrack` | Report `yt-dlp` error or invalid URL with progress feedback |
| Convert YouTube to MP4 | Valid YouTube URL, format `mp4` | `yt-dlp` downloads video in MP4 container, auto-imports into BlackBird library via `upsertTrack` | Report conversion failure or missing codecs gracefully |
| yt-dlp Binary Missing | System lacks `yt-dlp` binary in PATH | Main process detects absence before running | Return clean error advising user to install `yt-dlp` |

</frozen-after-approval>

## Code Map

- `package.json` -- Add `adm-zip` and `@types/adm-zip` for secure ZIP package extraction.
- `src/main/database.ts` -- Define `plugins` SQLite table, add DAO functions (`getPlugins`, `getPluginById`, `upsertPlugin`, `togglePlugin`, `deletePlugin`).
- `src/main/plugins.ts` -- Plugin manager service handling directory structure (`~/BlackBird/plugins`), web download, ZIP extraction, manifest parsing, and validation.
- `src/main/ytdlp.ts` -- Service to check binary availability, run `yt-dlp` child processes, stream progress events via IPC, and save resulting MP3/MP4.
- `src/main/index.ts` -- Register IPC handlers for plugin management (`plugin:*`) and YouTube conversion (`ytdlp:*`).
- `src/preload/index.ts` & `src/preload/index.d.ts` -- Expose typed `window.api.plugins` and `window.api.ytdlp` bridges.
- `src/renderer/index.html` -- Add `#btn-plugins` to sidebar navigation and create view structures in `#content-view`.
- `src/renderer/src/assets/main.css` -- Style Plugins Manager cards, switches, install modals, and plugin container layout.
- `src/renderer/src/renderer.ts` -- Add navigation routing for Plugins view, render Plugins Manager UI, handle install/toggle/delete, and mount active plugin screens.
- `resources/plugins/youtube-converter/` -- Bundled default YouTube Converter plugin assets (`manifest.json`, `index.js`, `style.css`).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- Install `adm-zip` and `@types/adm-zip` -- Required for downloading and extracting plugin zip archives.
- [x] `src/main/database.ts` -- Create `plugins` table and implement plugin repository methods -- Persists plugin metadata and active/inactive state.
- [x] `src/main/plugins.ts` -- Create plugin manager backend -- Handles ZIP download, unzipping, manifest loading, and directory scanning.
- [x] `src/main/ytdlp.ts` -- Create yt-dlp execution engine -- Manages download/conversion progress and integration with music/video library.
- [x] `src/main/index.ts` -- Register IPC handlers for plugin and yt-dlp operations -- Connects main process logic to IPC channels.
- [x] `src/preload/index.ts` & `src/preload/index.d.ts` -- Expose plugin and yt-dlp APIs on `window.api` -- Secure typed bridge for renderer.
- [x] `src/renderer/index.html` -- Add `#btn-plugins` sidebar entry and plugin view layout -- UI navigation anchor for plugins.
- [x] `src/renderer/src/assets/main.css` -- Add CSS styles for plugins screen, cards, toggles, and converter interface -- Polished user interface matching BlackBird dark theme.
- [x] `src/renderer/src/renderer.ts` -- Implement plugins management UI, toggle events, web install modal, and plugin DOM mounter -- Core renderer controller for plugins.
- [x] `resources/plugins/youtube-converter/` -- Create YouTube Converter plugin (manifest, UI script, conversion trigger) -- Deliver the requested first plugin.

**Acceptance Criteria:**
- Given the BlackBird app is running, when the user clicks "Plugins" in the sidebar, then the Plugins Manager view is displayed showing installed plugins and an "Install Plugin" action.
- Given a valid plugin `.zip` URL (or local file), when installed via the manager, then the archive is securely unpacked and the plugin appears in the list.
- Given an installed plugin, when the toggle switch is flipped, then its active state changes in the database and updates UI access immediately.
- Given the YouTube Converter plugin is active, when opened, then a dedicated interface loads inside the player DOM allowing URL input and format selection (MP3/MP4).
- Given a valid YouTube URL and MP3/MP4 format, when the download is initiated, then progress is reported and upon completion the media file is automatically added to the BlackBird library.

## Spec Change Log

- **Review Cycle 1**: Hardened security and resilience based on adversarial and edge-case review:
  - Added CLI flag injection prevention (`--` argument terminator and strict URL scheme validation) in `YtDlpService`.
  - Staged ZIP extraction in temp directory prior to writing to plugin destination to guarantee Zip-Slip and corrupt archive rollback.
  - Added XSS escaping for plugin metadata in renderer DOM rendering (`escapeHtml`).
  - Added scoped plugin API bridge to adhere to principle of least privilege.
  - Supported packaged app plugin discovery (`app.asar.unpacked/resources/plugins`).
  - Added cross-platform PATH and binary detection for Windows and non-standard setups.
  - Added `ffmpeg` pre-check for MP3 conversions and guarded against missing output files.

## Design Notes

### Plugin Manifest Schema (`manifest.json`):
```json
{
  "id": "youtube-converter",
  "name": "YouTube Converter",
  "version": "1.0.0",
  "description": "Convert and download YouTube videos to MP3 and MP4",
  "author": "BlackBird",
  "icon": "youtube",
  "main": "index.js",
  "styles": "style.css",
  "enabled": true
}
```

### DOM Mounting Protocol:
Each plugin `index.js` exports or attaches a `mount(container, api)` and `unmount(container)` function to a global registry `window.BlackBirdPlugins[pluginId]`. When the user navigates to the plugin's view, the container element is passed to `mount()`, allowing vanilla DOM rendering without security risks of raw script injection.

## Verification

**Commands:**
- `npm run typecheck` -- expected: TypeScript compilation passes with zero errors in node and web configurations.
- `npm run build` -- expected: Vite and Electron build succeed without errors.

**Manual checks (if no CLI):**
- Navigate to Plugins via sidebar, verify plugin listing, active toggle, and installation dialog.
- Open YouTube Converter plugin, enter a valid YouTube video URL, convert to MP3, and verify it plays in the Music library.

## Suggested Review Order

**Core Services & Business Logic**

- Modular plugin manager with staged ZIP extraction, manifest validation, and asset delivery
  [`plugins.ts:24`](../src/main/plugins.ts#L24)

- Resilient yt-dlp execution engine with progress streaming, format conversion, and library upsert
  [`ytdlp.ts:32`](../src/main/ytdlp.ts#L32)

**Data Persistence & IPC**

- SQLite database table definition and repository methods for plugin metadata and toggling
  [`database.ts:245`](../src/main/database.ts#L245)

- Main process IPC handlers registering plugin management and conversion routes
  [`index.ts:642`](../src/main/index.ts#L642)

- Typed contextBridge preload exposure providing a secure bridge for the renderer
  [`preload/index.ts:58`](../src/preload/index.ts#L58)

**User Interface & Renderer**

- Sidebar navigation entry for Plugins and Web ZIP install modal structure
  [`index.html:48`](../src/renderer/index.html#L48)

- Plugins manager view rendering, active status toggle switches, and DOM plugin mounter
  [`renderer.ts:4574`](../src/renderer/src/renderer.ts#L4574)

- Styling for plugins grid cards, switches, and converter layout
  [`main.css:1395`](../src/renderer/src/assets/main.css#L1395)

**First Plugin Package**

- YouTube Converter plugin manifest declaring metadata, entrypoint, and styles
  [`manifest.json:1`](../resources/plugins/youtube-converter/manifest.json#L1)

- YouTube Converter DOM runner interface with format selection and download trigger
  [`index.js:1`](../resources/plugins/youtube-converter/index.js#L1)
