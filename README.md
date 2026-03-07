# Photo Album Editor

[![Netlify Status](https://api.netlify.com/api/v1/badges/978a5ce9-8bc5-40f6-84db-71ec466bdd3e/deploy-status)](https://app.netlify.com/projects/photobookmaker/deploys)
[![CI](https://github.com/yiochen/album_maker/actions/workflows/ci.yml/badge.svg)](https://github.com/yiochen/album_maker/actions/workflows/ci.yml)

A web-based photo album editor with a Google Slides-like interface. Create beautiful photo albums with drag-and-drop, customizable templates, and multi-source photo import.

## Features

- 📸 **Multi-source Import** - Google Photos, dummy test images, or add your own
- 📁 **Multi-album Support** - Create, switch, and manage multiple albums
- 🎨 **7 Page Templates** - Full page, square, portrait, landscape, polaroid, grids
- 🖱️ **Drag & Drop** - Place and resize images on the canvas
- 💾 **Auto-save** - Albums persist in IndexedDB
- 📤 **Export** - JSON export/import, PNG page export

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (http://localhost:5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type check without building |
| `npm run pw:open` | Open Playwright test UI |
| `npm run pw:run` | Run Playwright tests |
| `npm run test:e2e` | Start dev server and run Playwright tests |

## Netlify Deployment

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

Or add a `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
```

### Google OAuth Function

Create these Netlify environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (optional, defaults to `https://photobookmaker.netlify.app/edit`)

Then POST your Google auth `code` to:

- `/.netlify/functions/auth`

## Project Structure

See [AGENTS.md](./AGENTS.md) for detailed architecture and development documentation.

## Tech Stack

- React 18 + TypeScript
- Vite
- Dexie.js (IndexedDB)
- Vanilla CSS

## License

MIT
