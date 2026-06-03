# Table Tennis Board

A lightweight public schedule board for table tennis tournaments.

## Features

- Public schedule page with search, table filters, status filters, and player autocomplete
- Public players list with rating, categories, and related match modal
- Admin demo login for managing players and matches
- Chinese / English language switch
- Local demo storage with `localStorage`
- GitHub Pages deployment workflow

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushes to `main` trigger GitHub Pages deployment through `.github/workflows/deploy.yml`.

Important: this version stores data in each browser's `localStorage`. A shared live tournament board needs Supabase, Firebase, or another backend.
