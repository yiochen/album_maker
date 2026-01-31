# Database Directory (`src/db`)

## Purpose
Manages persistent client-side storage using **IndexedDB** via the **Dexie.js** library. It handles albums, settings, and image caching.

## Key Logic
- **Singleton Instance**: The database is accessed via a singleton instance `db` exported from `index.ts`.
- **Helpers**: specialized objects (`albumDB`, `thumbnailDB`, `settingsDB`) abstract raw Dexie operations.
- **Caching**: `thumbnailDB` manages blob caching with a Time-To-Live (TTL) mechanism (default 7 days) to manage storage limits.

## Rules of Engagement
- **Do** use the helper objects (`albumDB`, etc.) instead of accessing `db` tables directly when possible.
- **Do** handle asynchronous operations; all DB calls return Promises.
- **Do** be mindful of storage quotas; clean up unused large blobs.
- **Do not** store large non-serializable objects directly; convert to JSON or Blobs first.
