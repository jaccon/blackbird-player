---
name: sqlite-dao-generator
description: Skill for creating Repositories / Data Access Objects using better-sqlite3.
---

# Skill: SQLite DAO Generator

When asked to create or modify database interactions, ALWAYS follow the DAO / Repository pattern:

1. **Isolation:** Never put SQL queries directly inside an IPC Handler or a general utility file.
2. **Class Structure:** Create a `[Entity]Repository.ts` class.
3. **Synchronous Execution:** Remember that `better-sqlite3` is synchronous. Methods do not need to be `async` unless you are wrapping them in Promises to prevent blocking issues manually, though direct synchronous returns are standard.
4. **Prepared Statements:** ALWAYS use `.prepare('SQL').run(params)` or `.prepare('SQL').all(params)`. Never concatenate strings directly to avoid SQL Injection.
5. **Types:** Define an interface for the Object structure being mapped from the database rows.
