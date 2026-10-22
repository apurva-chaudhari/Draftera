# Draftera client

React 19 + Vite. See the [root README](../README.md) for the product overview.

```bash
cp .env.example .env     # VITE_API_BASE_URL points at the API
npm install
npm run dev              # http://localhost:5173
npm test && npm run lint && npm run build
```

Translations live in `src/i18n/locales/` (English is the source; a unit test checks Hindi and Marathi have every key and placeholder). Deployed on Vercel with `vercel.json` (SPA rewrite and security headers).
