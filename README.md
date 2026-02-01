# Opsidius Leads Platform

Plateforme de prospection pour Opsidius — identification automatique des entreprises sans site web.

## Architecture

```
opsidius-leads-platform/
├── apps/
│   ├── web/           # Nuxt 4 Dashboard
│   └── api/           # Nitro API (scraper endpoints)
├── packages/
│   ├── scrapers/      # Pappers scraper
│   └── scoring/       # Algorithmes de scoring
└── infra/
    └── supabase/      # Database migrations
```

## Quick Start

### 1. Database Setup (Supabase)

```bash
# Create project on https://supabase.com
# Run migrations:
psql $DATABASE_URL -f infra/supabase/migrations/001_init.sql
```

### 2. Web Dashboard

```bash
cd apps/web
cp .env.example .env
# Fill in your Supabase credentials

npm install
npm run dev
```

### 3. Run Scraper (CLI)

```bash
# From root
pnpm install
pnpm scrape -- --days 30 --limit 50
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

## Scoring Algorithm

| Criteria | Points |
|----------|--------|
| No website | +30 |
| Created < 3 months | +20 |
| B2C sector | +20 |
| Pays de la Loire | +10 |
| Has email | +10 |
| Has phone | +10 |
| **Max** | **100** |

## Deployment

```bash
# Build and deploy to GitHub
pnpm build
git push origin main
```

## TODO

- [ ] Connect scraper API endpoint to dashboard
- [ ] Add email sequences
- [ ] Add lead enrichment (email finder)
- [ ] Add analytics/metrics
