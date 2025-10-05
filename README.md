# latentsculpt.com — React + TypeScript + Vite

This repository now uses React, TypeScript, and Vite. It includes a GitHub Actions workflow that builds and deploys the site to GitHub Pages on every push to `main`.

## Scripts
- `npm run dev` — Start the Vite dev server
- `npm run build` — Build for production to `dist/`
- `npm run preview` — Preview the production build locally

## Project structure
- `index.html` — Vite entry HTML
- `src/` — React app source (`App.tsx`, `main.tsx`, `styles.css`)
- `public/` — Static assets copied as‑is to the build (contains `CNAME` and `404.html`)
- `.github/workflows/deploy.yml` — GitHub Pages deploy workflow

## Deploy
This repo is configured to deploy via GitHub Actions to the GitHub Pages environment.

1) In GitHub, go to `Settings → Pages` and set:
   - "Build and deployment" → "Source" = `GitHub Actions`.
2) Push to `main`. The workflow will:
   - Install deps, build the site, and publish the `dist/` artifact to Pages.

Custom domain is preserved via `public/CNAME` (automatically copied to `dist/`). The SPA fallback is handled via `public/404.html`.

## Notes
- If you previously used `main / root` as the Pages source, switching to GitHub Actions avoids committing build artifacts to the repo and is the recommended approach for Vite apps.
- To customize styles or content, edit `src/App.tsx` and `src/styles.css`.
 - On first run locally, execute: `npm install` then `npm run dev`.
