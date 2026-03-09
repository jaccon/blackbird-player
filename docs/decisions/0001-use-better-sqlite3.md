# ADR 0001: Use better-sqlite3 for Local Database

**Date**: 2026-03-08
**Status**: Accepted

## Context
BlackBird Media Player needs a fast, reliable, and lightweight local storage solution to index thousands of music tags, playlists, and user preferences. The standard `sqlite3` driver relies heavily on asynchronous callbacks which can introduce overhead and complexity when managing large synchronous chunks coming from file parsers.

## Decision
We chose the `better-sqlite3` native C++ plugin.

## Consequences
**Pros:**
- Vastly superior performance over asynchronous sqlite libraries for local desktop apps.
- Extremely simple synchronous API, which fits perfectly with iterative chunk-based data insertions in the Main process.
- No callback hell or complex Promise chaining strictly for DB CRUD.

**Cons:**
- It is a native Node module. This requires cross-compilation and `@electron/rebuild` whenever targeting a different architecture (e.g., compiling for Mac Intel from Mac Silicon).
- If poorly managed (very large transactions on a single tick), it can block the Electron event loop. We mitigate this using the DAO pattern and controlled batch sizes.
