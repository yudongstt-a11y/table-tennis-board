# Public Deployment

This project is a static React + Vite app. The deploy output is `dist`.

## Netlify

The project includes `netlify.toml`.

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

Manual deploy after Netlify login:

```bash
npm run build
npm run deploy:netlify
```

If deploying from the Netlify dashboard, connect the repository and use:

- Build command: `npm run build`
- Publish directory: `dist`

## Important Data Note

This first version stores matches and players in `localStorage`. That means admin edits are stored in each browser, not in a shared cloud database. The public deployment will show demo data by default for every new visitor. To share live edits across devices, connect Supabase, Firebase, or another backend.
