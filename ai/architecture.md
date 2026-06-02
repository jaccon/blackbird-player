# BlackBird Media Player - Architecture Overview

## Application Layers

The application follows a strictly defined Multi-Process Architecture inherent to Electron, blended with a Repository Pattern for the Data Access Layer.

### 1. Main Process (Backend)
- **Role**: Bootstraps the application, handles OS-level features (Window Management, File System access), and executes heavy operations (e.g., audio metadata parsing).
- **Rules**:
  - Keep the event loop entirely free of long blocking operations.
  - Parse thousands of media files using chunking arrays.
  - All direct database calls live here.

### 2. Preload Process (Bridge)
- **Role**: Secure isolation layer between the Node.js backend and the web frontend.
- **Rules**:
  - Maps specific allowed functions through `contextBridge`.
  - Never expose general modules like `fs`, `sqlite`, or `path`.
  - Expose domain-driven APIs (e.g., `window.api.getTracks()`).

### 3. Renderer Process (Frontend)
- **Role**: The visual interface. Pure Vanilla JS/TS and CSS.
- **Rules**:
  - Treats the Main Process as an external API.
  - Manages DOM, animations, and local UI state.

## Data Layer (Database)
- **Database**: SQLite3 via `better-sqlite3`.
- **Pattern**: Repository / DAO. Database logic must not be mixed with IPC Handlers.
