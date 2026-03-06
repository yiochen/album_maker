# Sources Directory (`src/sources`)

## Purpose
Manages integration with external image providers (e.g., Google Photos, local files) via a plugin architecture.

## Key Logic
- **`PhotoSource` Interface**: Defined in `types.ts`. All sources must implement this interface to provide authentication, fetching, and thumbnail generation.
- **Registry**: `index.ts` maintains a registry of available sources. New sources must be registered here to be accessible in the UI.
- **Current Providers**:
  - `dummy-colors`: deterministic local test images.
  - `uploaded`: reads uploaded image records from IndexedDB local routes.
  - `google-photos`: remote provider via Google Photos API.

## Rules of Engagement
- **Do** implement the `PhotoSource` interface completely for any new source.
- **Do** register new sources in `index.ts`.
- **Do** handle authentication flow within the source implementation.
- **Do** provide `width`/`height` when available; these are used for sizing and low-resolution print warnings.
- **Do not** expose private API keys or secrets in the client-side code (use environment variables or proxy services if needed).
