# Prompt: Generate New Electron Feature

When generating a complete new feature spanning frontend and backend, use this checklist internally:
1. Is Database changed? -> Update schema and DAO.
2. Is Main logic created? -> Add domain logic in `src/main`.
3. Needs UI communication? -> Update `preload/index.ts` and IPC Handlers.
4. UI Created? -> Create Vanilla DOM logic in `src/renderer`.

Always output code ensuring the Single Responsibility Principle. Use English naming.
