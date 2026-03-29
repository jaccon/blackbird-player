# BlackBird Media Player 🎵

BlackBird is a sleek, modern, and locally-focused desktop media player built with **Electron** and **Vite**. It supports importing local music/video folders natively as well as integrating with YouTube to manage and play online media within the same beautiful interface.

## ✨ Features

### Media Management
* **Smart Folder Import**: Select any local directory, and BlackBird will recursively scan and extract ID3 tags, album art, and durations automatically.
* **YouTube Integration**: Paste a YouTube link to instantly fetch its metadata (oEmbed) and append it to your library. Play the video directly within BlackBird via an embedded player overlay.
* **Automatic Metadata Extraction**: Automatically parses local files to extract `Title`, `Artist`, `Album`, `Duration`, and `Cover Art`.
* **Custom `local://` Protocol**: High-performance local media streaming using a custom privileged protocol to bypass modern browser security restrictions.

### Library & Organization
* **Smart Categories**: Your media is organized intelligently into `All Songs`, `Albums`, `Artists`, and `All Videos`.
* **Playback History (New)**: A dedicated `History` tab to revisit your 100 most recently played tracks, showing thumbnails and precise local date/time of play.
* **Playlists**: Create custom playlists, drag & drop your tracks into them seamlessly, and manage collections.
* **Favorites System**: Instantly mark any track or video as a favorite (❤️) and access them all instantly in the `My Favorites` tab.
* **Metadata Editor**: Click the inline "**Edit**" button (✏️) on any track to instantly update its `Title`, `Artist`, `Album`, `Kind`, `Description`, and upload custom `.JPG` `Artwork`.
* **Deep Advanced Search**: Find what you want lightning fast using the top search bar. Search filters comprehensively across titles, artists, albums, formats (Kind), and your custom descriptions concurrently.

### Playback & Controls
* **Universal Player**: Robust playing queue system supporting both local Audio/Video files and YouTube Web embeds simultaneously.
* **Robust Error Handling**: Automatically detects if files were moved, renamed, or deleted. It visually flags "ghost" tracks and automatically skips to the next available song in your playlist.
* **Playback Modes**: Intuitive playback controls with **Shuffle** and **Repeat** states (Repeat All tracks, Repeat One track).
* **Multi-selection**: Hold `Cmd/Ctrl` or `Shift` combinations to select multiple consecutive or alternate tracks, build selections, and bulk delete contents from your database.

### Customization & Data Maintenance
* **Dynamic Theming System**: Alter the entire look of the app interface on the fly. Import pre-configured or custom `.json` themes (like the *Cyberpunk Theme*) via the **Theme Options** modal in the sidebar.
* **Full Data Export / Import**: Easily migrate or create a hard backup of your entire application environment. Use the native OS top menu (`File > Export Settings` or `File > Import Settings`) to bundle your whole database (Playlists, Track indexes, Tags, Play counts) and your imported Themes into a single lightweight `.json` package file that can be restored instantly at any time.

---

## 🚀 Getting Started

### Recommended IDE Setup
- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed globally on your machine.

### Installation & Execution
1. Clone the repository:
   ```bash
   git clone https://github.com/jaccon/blackbird-player.git
   cd blackbird-player
   ```
2. Install the necessary NPM dependencies:
   ```bash
   npm install
   ```
3. Run the application in development mode with **hot-reload** enabled:
   ```bash
   npm run dev
   ```

### Application Building
To package the app as an executable application for your targeted operating system:
```bash
# For macOS
$ npm run build:mac

# For Windows
$ npm run build:win

# For Linux
$ npm run build:linux
```

---

## 🗄 Architecture & Tech Stack
* **Electron OS wrappers** for running the Chromium-based web application natively as a desktop window.
* **Vite** serving as an incredibly fast Hot Module Replacement (HMR) bundler.
* **Vanilla HTML, CSS, & TypeScript** maintaining ultra-high performance, deep custom DOM management, and precise control over the UI/UX.
* **SQLite (via `better-sqlite3`)** processing requests natively as the backend database to handle massive scale media libraries instantaneously.
* **music-metadata** NPM module reading streams of buffers to decode ID3 data securely.
* **Lucide Icons** as scalable and stylistic vector assets throughout the interface.

---

## 🤝 Contributing
Contributions are openly welcome! Feel free to raise issues on bugs or feature suggestions, and submit detailed pull requests. 

## 📝 License
This project is provided under the [MIT License](LICENSE).
