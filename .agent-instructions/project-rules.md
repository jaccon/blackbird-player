# BlackBird Media Player - AI Development Rules

## Tech Stack
- **Electron** (Main, Preload, Renderer)
- **TypeScript** (Strict mode)
- **Vite** (Build Tool Frontend)
- **better-sqlite3** (Local database in C++)
- **music-metadata** (Audio file parsing)
- Vanilla DOM/CSS (User Interface)

## Architecture & Engineering Principles
1. **Electron Separation of Concerns**:
   - **Main**: Handles system integrations (directory reading, file system), heavy media processing, and communication with the database.
   - **Preload**: Acts EXCLUSIVELY as a secure bridge. Use `contextBridge`. Never expose entire Node.js modules (e.g., `fs`, `path`) to the Renderer.
   - **Renderer**: Focused only on the front-end, interface state (DOM), and styling. System data must arrive via secure IPC.
2. **IPC Communication Patterns**:
   - Long-term responses with specific returns: use `$ ipcMain.handle` in Main and await in Renderer with `$ ipcRenderer.invoke()`.
   - Direct, one-way events: `$ ipcRenderer.send` / `$ ipcRenderer.on`.
3. **Database Access**:
   - Better-SQLite3 works synchronously.
   - Implement the **Repository/DAO** pattern to logically abstract SQL usage from the central part of the Main process. IPC handlers should only invoke repositories.
4. **Performance & Thread Blocking**:
   - Large-scale directory reading and media scanning operations require a non-blocking design in the Main Thread Event Loop. Use iterative batching (chunks).

## Clean Code Principles
1. **Naming Conventions**:
   - Variables, Instances, and Functions/Methods: `camelCase` and highly descriptive names (e.g., `scanMusicLibrary` instead of `scan`).
   - Classes, Types, and Interfaces: `PascalCase`.
   - Standardized use of the English language for ALL source code (files, variables, and logical comments).
2. **Single Responsibility Principle (SRP)**:
   - Large functions must be broken down. A method performs only one well-defined domain operation. Modularize extensive manipulation blocks into helper and utility files (`utils`).
3. **Typing and Safety**:
   - **Avoid the `any` type**. Build strict types and complete interfaces in TypeScript to predict structure and protect data input on IPC connections.
4. **Logical Exception Handling**:
   - `try/catch` handlers always accompanied by clean returns when dispatching to the Renderer.
   - Promises must have predictable returns if they encounter problems or failures from Parser Libs. Avoid raw exceptions crashing into the UI (User Interface).
5. **Formatting and Linting**:
   - Strictly obey the linting/formatting pre-setup (Eslint and Prettier) available in package.json.
