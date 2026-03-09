---
name: electron-ipc-builder
description: Skill for generating safe and typed IPC interfaces between Main and Renderer in Electron.
---

# Skill: Electron IPC Builder

When the user asks you to implement a new interaction between the Main and Renderer processes, follow these strict guidelines:

1. **Understand the Flow:**
   - Define if it's a one-way message (Send) or a two-way request (Invoke/Handle).
2. **Preload First:**
   - Define the interface mapping in `preload/index.ts` inside the `contextBridge`. Add the proper TypeScript types so the Renderer gets autocomplete.
3. **Main Process Handler:**
   - Create the listener in `main/index.ts` (or separated handler file). Focus ONLY on receiving the execution, log it, and call the respective logic (like a Repository). Return typed values.
4. **Renderer Consumption:**
   - Consume it in the frontend using `window.api.[methodName]`. Never assume the API will return successfully instantly; use `try/catch` and async/await.
